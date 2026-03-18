import express from 'express';
import crypto from 'crypto';
import MagicLink from '../models/MagicLink.js';
import Video from '../models/Video.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// @desc    Generate a magic link for a video
// @route   POST /api/magic-links/generate
// @access  Private (Staff/Admin)
router.post('/generate', protect, async (req, res) => {
    try {
        const { videoId } = req.body;

        if (!videoId) {
            return res.status(400).json({ message: 'Video ID is required' });
        }

        const video = await Video.findById(videoId);
        if (!video) {
            return res.status(404).json({ message: 'Video not found' });
        }

        // Generate a random token
        const token = crypto.randomBytes(32).toString('hex'); // 64 chars

        // Set expiry to 4 days from now
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 4);

        const magicLink = await MagicLink.create({
            token,
            video: videoId,
            createdBy: req.user._id,
            expiresAt
        });

        // Determine the frontend URL
        // Hardcode production URL to prevent env var issues
        const frontendUrl = process.env.NODE_ENV === 'production'
            ? 'https://video.hestonautomotive.com'
            : 'http://localhost:3000';

        res.status(201).json({
            token: magicLink.token,
            expiresAt: magicLink.expiresAt,
            url: `${frontendUrl}/watch/${magicLink.token}`
        });

    } catch (error) {
        console.error('Error generating magic link:', error);
        res.status(500).json({ message: 'Failed to generate link' });
    }
});

// @desc    Get video via magic link token
// @route   GET /api/magic-links/:token
// @access  Public
router.get('/:token', async (req, res) => {
    try {
        const { token } = req.params;

        const magicLink = await MagicLink.findOne({ token }).populate({
            path: 'video',
            populate: { path: 'uploadedBy', select: 'name username' }
        });

        if (!magicLink) {
            return res.status(404).json({ message: 'Link expired or invalid' });
        }

        // Technically TTL index handles deletion, but double check expiration just in case
        if (new Date() > magicLink.expiresAt) {
            return res.status(410).json({ message: 'Link expired' });
        }

        res.json(magicLink.video);

    } catch (error) {
        console.error('Error validating magic link:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

export default router;
