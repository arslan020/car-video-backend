import express from 'express';
import Video from '../models/Video.js';
import { protect, admin } from '../middleware/authMiddleware.js';
import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import { uploadToCloudflareStream } from '../utils/cloudflareStream.js';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
dotenv.config();

const router = express.Router();

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

// @desc    Upload a video
// @route   POST /api/videos
// @access  Private/Staff
router.post('/', protect, (req, res, next) => {
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

        // Check if YouTube URL is provided
        if (youtubeUrl) {
            const youtubeVideoId = extractYouTubeId(youtubeUrl);

            if (!youtubeVideoId) {
                return res.status(400).json({ message: 'Invalid YouTube URL or video ID' });
            }

            // Create video with YouTube source
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
                reserveCarLink: req.body.reserveCarLink || undefined
            });

            return res.status(201).json(video);
        }

        // Handle file upload to Cloudflare Stream
        if (!req.file) {
            return res.status(400).json({ message: 'No video file or YouTube URL provided' });
        }

        tempFilePath = req.file.path;
        console.log('Uploading to Cloudflare Stream:', tempFilePath);

        // Upload to Cloudflare Stream
        const cloudflareVideo = await uploadToCloudflareStream(tempFilePath, {
            title: req.body.title || req.file.originalname
        });

        console.log('Cloudflare upload successful:', cloudflareVideo.videoId);

        // Create video record in database
        const video = await Video.create({
            uploadedBy: req.user._id,
            videoUrl: cloudflareVideo.videoUrl,
            videoSource: 'cloudflare',
            cloudflareVideoId: cloudflareVideo.videoId,
            originalName: req.file.originalname,
            title: req.body.title || req.file.originalname,
            registration: req.body.registration || undefined,
            make: req.body.make || undefined,
            model: req.body.model || undefined,
            vehicleDetails: req.body.vehicleDetails ? JSON.parse(req.body.vehicleDetails) : undefined,
            mileage: req.body.mileage || undefined,
            reserveCarLink: req.body.reserveCarLink || undefined
        });

        // Clean up temporary file
        if (tempFilePath && fs.existsSync(tempFilePath)) {
            fs.unlinkSync(tempFilePath);
        }

        res.status(201).json(video);
    } catch (error) {
        console.error('=== VIDEO UPLOAD ERROR ===');
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);

        // Clean up temporary file on error
        if (tempFilePath && fs.existsSync(tempFilePath)) {
            try {
                fs.unlinkSync(tempFilePath);
            } catch (cleanupError) {
                console.error('Failed to clean up temp file:', cleanupError);
            }
        }

        res.status(500).json({ message: 'Video upload failed', error: error.message });
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
router.get('/:id', async (req, res) => {
    try {
        const video = await Video.findById(req.params.id);
        if (video) {
            video.viewCount = (video.viewCount || 0) + 1;
            await video.save();
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
        res.json({ message: 'Video removed successfully' });
    } catch (error) {
        console.error('Delete video error:', error.message);
        res.status(500).json({ message: 'Failed to delete video' });
    }
});

export default router;