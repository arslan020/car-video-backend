import express from 'express';
import axios from 'axios';
import Video from '../models/Video.js';
import AuditLog from '../models/AuditLog.js';
import { protect, admin, optionalProtect } from '../middleware/authMiddleware.js';
import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import { uploadToCloudflareStream } from '../utils/cloudflareStream.js';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
dotenv.config();

const router = express.Router();

// In-memory store for SSE upload progress connections
// key: jobId, value: { res (SSE response), progress, done, error }
const progressClients = new Map();

// Completed jobs cache (for race condition: job finishes before client connects)
const completedJobs = new Map();

// Helper: send SSE event to a job's client
const sendProgress = (jobId, data) => {
    const client = progressClients.get(jobId);
    if (client && !client.res.writableEnded) {
        client.res.write(`event: progress\ndata: ${JSON.stringify(data)}\n\n`);
    }
};

// Helper: send done event and close SSE connection
const closeProgress = (jobId) => {
    const client = progressClients.get(jobId);
    if (client) {
        if (!client.res.writableEnded) {
            client.res.write(`event: done\ndata: {}\n\n`);
            client.res.end();
        }
        clearInterval(client.heartbeat);
        progressClients.delete(jobId);
    } else {
        // Client hasn't connected yet — store result for when it does
        completedJobs.set(jobId, { done: true });
        setTimeout(() => completedJobs.delete(jobId), 60000); // cleanup after 1 min
    }
};

// Helper: send error event and close SSE connection
const sendProgressError = (jobId, message) => {
    const client = progressClients.get(jobId);
    if (client) {
        if (!client.res.writableEnded) {
            client.res.write(`event: error\ndata: ${JSON.stringify({ message })}\n\n`);
            client.res.end();
        }
        clearInterval(client.heartbeat);
        progressClients.delete(jobId);
    } else {
        completedJobs.set(jobId, { error: true, message });
        setTimeout(() => completedJobs.delete(jobId), 60000);
    }
};

// Cloudinary config (keeping for backward compatibility)
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

// Use local storage for temporary file uploads (before sending to Cloudflare Stream)
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadDir = path.join(process.cwd(), 'uploads');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 3 * 1024 * 1024 * 1024 // 3GB limit
    }
});

// Helper function to extract YouTube video ID from URL
const extractYouTubeId = (input) => {
    if (!input) return null;

    // Remove whitespace
    input = input.trim();

    // If it's already just an ID (11 characters, alphanumeric with - and _)
    if (/^[a-zA-Z0-9_-]{11}$/.test(input)) {
        return input;
    }

    // Match various YouTube URL formats
    const patterns = [
        /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
        /youtube\.com\/watch\?.*v=([a-zA-Z0-9_-]{11})/
    ];

    for (const pattern of patterns) {
        const match = input.match(pattern);
        if (match && match[1]) {
            return match[1];
        }
    }

    return null;
};

// @desc    SSE progress stream for a video upload job
// @route   GET /api/videos/progress/:jobId
// @access  Private
router.get('/progress/:jobId', protect, (req, res) => {
    const { jobId } = req.params;

    // Set SSE headers — X-Accel-Buffering: no prevents nginx (Render) from buffering
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');       // disables nginx proxy buffering
    res.setHeader('Surrogate-Control', 'no-store'); // disables CDN caching
    res.flushHeaders();

    // Handle race condition: job already finished before client connected
    const completed = completedJobs.get(jobId);
    if (completed) {
        completedJobs.delete(jobId);
        if (completed.done) {
            res.write(`event: done\ndata: {}\n\n`);
        } else {
            res.write(`event: error\ndata: ${JSON.stringify({ message: completed.message })}\n\n`);
        }
        res.end();
        return;
    }

    // Heartbeat every 15s to keep connection alive through TUS upload pauses
    const heartbeat = setInterval(() => {
        if (!res.writableEnded) {
            res.write(': heartbeat\n\n'); // SSE comment, ignored by browser
        } else {
            clearInterval(heartbeat);
        }
    }, 15000);

    // Register this SSE connection
    progressClients.set(jobId, { res, heartbeat });

    req.on('close', () => {
        clearInterval(heartbeat);
        progressClients.delete(jobId);
    });
});

// @desc    Upload a video
// @route   POST /api/videos
// @access  Private/Staff
router.post('/', protect, (req, res, next) => {
    // Set 30-minute timeout for large video uploads
    req.setTimeout(30 * 60 * 1000);
    res.setTimeout(30 * 60 * 1000);
    next();
}, (req, res, next) => {
    // Only use multer for multipart/form-data (file uploads)
    // Skip multer for application/json (YouTube URL uploads)
    const contentType = req.headers['content-type'] || '';

    if (contentType.includes('application/json')) {
        // Skip multer for JSON requests (YouTube URLs)
        return next();
    }

    // Use multer for file uploads
    upload.single('video')(req, res, next);
}, async (req, res) => {
    let tempFilePath = null;

    try {
        console.log('=== VIDEO ROUTE HIT ===');
        console.log('Content-Type:', req.headers['content-type']);
        console.log('Has file:', !!req.file);
        console.log('youtubeUrl:', req.body?.youtubeUrl);

        const { youtubeUrl } = req.body || {};

        // ── YouTube URL upload (sync, no SSE needed) ──────────────────────────
        if (youtubeUrl) {
            const youtubeVideoId = extractYouTubeId(youtubeUrl);

            if (!youtubeVideoId) {
                return res.status(400).json({ message: 'Invalid YouTube URL or video ID' });
            }

            const video = await Video.create({
                uploadedBy: req.user._id,
                videoUrl: `https://www.youtube.com/embed/${youtubeVideoId}`,
                videoSource: 'youtube',
                youtubeVideoId: youtubeVideoId,
                title: req.body.title || 'YouTube Video',
                registration: req.body.registration || undefined,
                make: req.body.make || undefined,
                model: req.body.model || undefined,
                vehicleDetails: req.body.vehicleDetails ? JSON.parse(req.body.vehicleDetails) : undefined,
                mileage: req.body.mileage || undefined,
                reserveCarLink: req.body.reserveCarLink || undefined,
                thumbnailUrl: `https://img.youtube.com/vi/${youtubeVideoId}/mqdefault.jpg`
            });

            await AuditLog.create({
                action: 'UPLOAD_VIDEO',
                user: req.user._id,
                details: `Uploaded YouTube video: ${video.title} (${video.registration || 'No Reg'})`,
                targetId: video._id,
                metadata: { registration: video.registration }
            });

            return res.status(201).json(video);
        }

        // ── File upload (async with SSE progress) ─────────────────────────────
        if (!req.file) {
            return res.status(400).json({ message: 'No video file or YouTube URL provided' });
        }

        tempFilePath = req.file.path;

        // Generate a unique jobId for this upload
        const jobId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

        // Respond immediately with jobId so frontend can open SSE
        res.status(202).json({ jobId });

        // ── Background: upload to Cloudflare, stream progress via SSE ─────────
        const userId = req.user._id;
        const body = req.body;
        const originalName = req.file.originalname;

        // Small delay to allow frontend to open SSE connection
        await new Promise(r => setTimeout(r, 500));

        try {
            console.log('Uploading to Cloudflare Stream:', tempFilePath);

            const cloudflareVideo = await uploadToCloudflareStream(tempFilePath, {
                title: body.title || originalName,
                onProgress: (percentage) => {
                    sendProgress(jobId, { percent: percentage });
                }
            });

            console.log('Cloudflare upload successful:', cloudflareVideo.videoId);

            const video = await Video.create({
                uploadedBy: userId,
                videoUrl: cloudflareVideo.videoUrl,
                videoSource: 'cloudflare',
                cloudflareVideoId: cloudflareVideo.videoId,
                originalName: originalName,
                title: body.title || originalName,
                registration: body.registration || undefined,
                make: body.make || undefined,
                model: body.model || undefined,
                vehicleDetails: body.vehicleDetails ? JSON.parse(body.vehicleDetails) : undefined,
                mileage: body.mileage || undefined,
                reserveCarLink: body.reserveCarLink || undefined,
                thumbnailUrl: cloudflareVideo.thumbnail
            });

            // Clean up temp file
            if (tempFilePath && fs.existsSync(tempFilePath)) {
                fs.unlinkSync(tempFilePath);
            }

            await AuditLog.create({
                action: 'UPLOAD_VIDEO',
                user: userId,
                details: `Uploaded video: ${video.title} (${video.registration || 'No Reg'})`,
                targetId: video._id,
                metadata: { registration: video.registration }
            });

            // Send done event via SSE
            closeProgress(jobId);

        } catch (bgError) {
            console.error('=== BACKGROUND CLOUDFLARE UPLOAD ERROR ===');
            console.error(bgError.message);

            if (tempFilePath && fs.existsSync(tempFilePath)) {
                try { fs.unlinkSync(tempFilePath); } catch (_) {}
            }

            sendProgressError(jobId, bgError.message);
        }

    } catch (error) {
        console.error('=== VIDEO UPLOAD ERROR ===');
        console.error('Error message:', error.message);

        if (tempFilePath && fs.existsSync(tempFilePath)) {
            try { fs.unlinkSync(tempFilePath); } catch (_) {}
        }

        // Only send HTTP error if we haven't responded yet
        if (!res.headersSent) {
            res.status(500).json({ message: 'Video upload failed', error: error.message });
        }
    }
});

// @desc    Get all videos (Staff see their own, Admins see all)
// @route   GET /api/videos
// @access  Private
router.get('/', protect, async (req, res) => {
    try {
        let query = {};
        if (req.user.role !== 'admin' && req.query.all !== 'true') {
            query.uploadedBy = req.user._id;
        }

        const videos = await Video.find(query)
            .populate('uploadedBy', 'username name')
            .populate({ path: 'views.shareId', select: 'suspended createdAt metadata user', populate: { path: 'user', select: 'name username' } })
            .sort({ createdAt: -1 });

        res.json(videos);
    } catch (error) {
        console.error('Fetch videos error:', error.message);
        res.status(500).json({ message: 'Failed to fetch videos' });
    }
});



// @desc    Get video by ID (Public)
// @route   GET /api/videos/:id
// @access  Public
router.get('/:id', optionalProtect, async (req, res) => {

    try {
        const video = await Video.findById(req.params.id);
        if (video) {
            const shareId = req.query.s;
            const isStaff = req.user && (req.user.role === 'admin' || req.user.role === 'staff' || req.user.role === 'user');

            // Expiration check for customers (non-staff)
            if (!isStaff) {
                if (shareId && shareId !== 'undefined' && shareId !== 'null') {
                    // Unique link check via AuditLog
                    try {
                        const shareLog = await AuditLog.findById(shareId);
                        if (!shareLog || shareLog.targetId.toString() !== req.params.id || !['SHARE_VIDEO_LINK', 'SEND_VIDEO_LINK'].includes(shareLog.action)) {
                            return res.status(403).json({ message: 'Invalid or unauthorized video link' });
                        }
                        // Suspended link check
                        if (shareLog.suspended) {
                            return res.status(403).json({ message: 'This video link has been suspended by the dealer.' });
                        }
                        if (shareLog.metadata?.expiresAt && new Date() > new Date(shareLog.metadata.expiresAt)) {
                            return res.status(403).json({ message: 'This video link has expired (4-day limit)' });
                        }

                        // Valid shared link for a customer: Increment View Count & record viewer
                        video.viewCount = (video.viewCount || 0) + 1;
                        video.views = video.views || [];
                        video.views.push({
                            shareId: shareLog._id,
                            viewedAt: new Date(),
                            viewerName: shareLog.metadata?.customerName || null,
                            viewerEmail: shareLog.metadata?.sentToEmail || null,
                            viewerMobile: shareLog.metadata?.sentToMobile || null,
                        });
                        await video.save();

                    } catch (err) {
                        return res.status(403).json({ message: 'Invalid video link format' });
                    }
                } else if (video.linkExpiresAt && new Date() > video.linkExpiresAt) {
                    // Legacy fallback
                    return res.status(403).json({ message: 'This video link has expired (4-day limit)' });
                } else {
                    // Accessed by non-staff without a valid share token (e.g. direct link)
                    // We don't increment view count here to preserve accuracy
                }
            } else {
                // Accessed by staff. We do not increment the view count.
            }

            res.json(video);
        } else {
            res.status(404).json({ message: 'Video not found' });
        }
    } catch (err) {
        res.status(404).json({ message: 'Video not found' });
    }
});

// @desc    Update reserve car link (Admin Only)
// @route   PATCH /api/videos/:id/reserve-link
// @access  Private/Admin
router.patch('/:id/reserve-link', protect, admin, async (req, res) => {
    try {
        const { reserveCarLink } = req.body;
        const video = await Video.findById(req.params.id);

        if (!video) {
            return res.status(404).json({ message: 'Video not found' });
        }

        video.reserveCarLink = reserveCarLink || '';
        await video.save();

        res.json({ message: 'Reserve car link updated successfully', video });
    } catch (error) {
        console.error('Update reserve link error:', error.message);
        res.status(500).json({ message: 'Failed to update reserve car link' });
    }
});

// @desc    Register a link share (Copy to clipboard)
// @route   PATCH /api/videos/:id/share
// @access  Private
router.patch('/:id/share', protect, async (req, res) => {
    try {
        const video = await Video.findById(req.params.id);

        if (!video) {
            return res.status(404).json({ message: 'Video not found' });
        }

        // Set expiration to 4 days from now
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 4);

        video.linkExpiresAt = expiresAt;
        await video.save();

        // Log the share action
        const log = await AuditLog.create({
            action: 'SHARE_VIDEO_LINK',
            user: req.user._id,
            details: `Shared video link: ${video.title} (${video.registration || 'No Reg'}). Expiry set to 4 days.`,
            targetId: video._id,
            metadata: { registration: video.registration, expiresAt }
        });

        res.json({ message: 'Link sharing registered, expiration set to 4 days', shareId: log._id, expiresAt });
    } catch (error) {
        console.error('Share link error:', error.message);
        res.status(500).json({ message: 'Failed to register link share' });
    }
});

// @desc    Delete a video (Admin Only)
// @route   DELETE /api/videos/:id
// @access  Private/Admin
router.delete('/:id', protect, async (req, res) => {
    try {
        const video = await Video.findById(req.params.id);

        if (!video) {
            return res.status(404).json({ message: 'Video not found' });
        }

        // Check permissions: Admin or Owner
        if (req.user.role !== 'admin' && video.uploadedBy.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Not authorized to delete this video' });
        }

        // Delete from Cloudinary (only if it's a Cloudinary video)
        if (video.videoSource === 'cloudinary' && video.publicId) {
            await cloudinary.uploader.destroy(video.publicId, { resource_type: 'video' });
        }

        await video.deleteOne();

        // Log the delete action
        await AuditLog.create({
            action: 'DELETE_VIDEO',
            user: req.user._id,
            details: `Deleted video: ${video.title} (${video.registration || 'No Reg'})`,
            targetId: video._id,
            metadata: { registration: video.registration }
        });

        res.json({ message: 'Video removed successfully' });
    } catch (error) {
        console.error('Delete video error:', error.message);
        res.status(500).json({ message: 'Failed to delete video' });
    }
});

export default router;