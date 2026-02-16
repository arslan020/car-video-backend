import express from 'express';
import VehicleMetadata from '../models/VehicleMetadata.js';
import { protect, admin } from '../middleware/authMiddleware.js';

const router = express.Router();

// @desc    Get vehicle metadata by registration
// @route   GET /api/vehicle-metadata/:registration
// @access  Public
router.get('/:registration', async (req, res) => {
    try {
        const registration = req.params.registration.toUpperCase().trim();
        let metadata = await VehicleMetadata.findOne({ registration });

        if (!metadata) {
            // Return empty metadata if not found
            return res.json({ registration, reserveLink: '' });
        }

        res.json(metadata);
    } catch (error) {
        console.error('Get metadata error:', error.message);
        res.status(500).json({ message: 'Failed to get vehicle metadata' });
    }
});

// @desc    Update vehicle reserve link
// @route   PATCH /api/vehicle-metadata/:registration/reserve-link
// @access  Private/Admin
router.patch('/:registration/reserve-link', protect, admin, async (req, res) => {
    try {
        const registration = req.params.registration.toUpperCase().trim();
        const { reserveLink } = req.body;

        let metadata = await VehicleMetadata.findOne({ registration });

        if (!metadata) {
            // Create new metadata if doesn't exist
            metadata = new VehicleMetadata({
                registration,
                reserveLink: reserveLink || ''
            });
        } else {
            metadata.reserveLink = reserveLink || '';
        }

        await metadata.save();
        res.json({ message: 'Reserve link updated successfully', metadata });
    } catch (error) {
        console.error('Update reserve link error:', error.message);
        res.status(500).json({ message: 'Failed to update reserve link' });
    }
});

export default router;
