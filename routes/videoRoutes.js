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

            // Check for existing video
            const existingVideo = await Video.findOne({ registration: req.body.registration }).populate('uploadedBy', 'name username');
            if (existingVideo) {
                const uploaderName = existingVideo.uploadedBy?.name || existingVideo.uploadedBy?.username || 'Unknown User';
                return res.status(400).json({ message: `This car already has a video uploaded by ${uploaderName}. Please delete it first.` });
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
                vehicleDetails: req.body.vehicleDetails ? JSON.parse(req.body.vehicleDetails) : undefined
            });

            return res.status(201).json(video);
        }

        // Handle file upload to Cloudflare Stream
        if (!req.file) {
            return res.status(400).json({ message: 'No video file or YouTube URL provided' });
        }

        tempFilePath = req.file.path;
        console.log('Uploading to Cloudflare Stream:', tempFilePath);

        // Check for existing video
        if (req.body.registration) {
            const existingVideo = await Video.findOne({ registration: req.body.registration }).populate('uploadedBy', 'name username');
            if (existingVideo) {
                // Clean up temp file immediately
                if (tempFilePath && fs.existsSync(tempFilePath)) {
                    fs.unlinkSync(tempFilePath);
                }
                const uploaderName = existingVideo.uploadedBy?.name || existingVideo.uploadedBy?.username || 'Unknown User';
                return res.status(400).json({ message: `This car already has a video uploaded by ${uploaderName}. Please delete it first.` });
            }
        }

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
            vehicleDetails: req.body.vehicleDetails ? JSON.parse(req.body.vehicleDetails) : undefined
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

// @desc    Get all videos (Staff see all to check for duplicates)
// @route   GET /api/videos
// @access  Private
router.get('/', protect, async (req, res) => {
    try {
        // Allow all staff to see all videos so they can see "Uploaded by X" - Forced Refresh
        // If we want to restrict editing/deleting, we should do that in the specific routes
        const videos = await Video.find({})
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

// @desc    Delete a video (Admin or Video Owner)
// @route   DELETE /api/videos/:id
// @access  Private
router.delete('/:id', protect, async (req, res) => {
    try {
        const video = await Video.findById(req.params.id);

        if (!video) {
            return res.status(404).json({ message: 'Video not found' });
        }

        // Check if user is admin or the video owner
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
