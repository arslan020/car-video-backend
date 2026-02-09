import express from 'express';
import Video from '../models/Video.js';
import { protect, admin } from '../middleware/authMiddleware.js';
import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import dotenv from 'dotenv';
dotenv.config();

const router = express.Router();

// Cloudinary config
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'car-appraisals',
        resource_type: 'video',
    },
});

const upload = multer({ storage: storage });

// @desc    Upload a video
// @route   POST /api/videos
// @access  Private/Staff
router.post('/', protect, upload.single('video'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No video file provided' });
        }

        const video = await Video.create({
            uploadedBy: req.user._id,
            videoUrl: req.file.path,
            publicId: req.file.filename,
            originalName: req.file.originalname,
            title: req.body.title || req.file.originalname,
            registration: req.body.registration || undefined,
            make: req.body.make || undefined,
            make: req.body.make || undefined,
            model: req.body.model || undefined,
            vehicleDetails: req.body.vehicleDetails ? JSON.parse(req.body.vehicleDetails) : undefined
        });

        res.status(201).json(video);
    } catch (error) {
        console.error('=== VIDEO UPLOAD ERROR ===');
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
        res.status(500).json({ message: 'Video upload failed', error: error.message });
    }
});

// @desc    Get all videos (Staff see their own, Admins see all)
// @route   GET /api/videos
// @access  Private
router.get('/', protect, async (req, res) => {
    try {
        let query = {};
        if (req.user.role !== 'admin') {
            query.uploadedBy = req.user._id;
        }

        const videos = await Video.find(query)
            .populate('uploadedBy', 'username')
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

// @desc    Delete a video (Admin Only)
// @route   DELETE /api/videos/:id
// @access  Private/Admin
router.delete('/:id', protect, admin, async (req, res) => {
    try {
        const video = await Video.findById(req.params.id);

        if (!video) {
            return res.status(404).json({ message: 'Video not found' });
        }

        // Delete from Cloudinary
        if (video.publicId) {
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
