import express from 'express';
import { protect, admin } from '../middleware/authMiddleware.js';
import AuditLog from '../models/AuditLog.js';

const router = express.Router();

// @desc    Get all audit logs
// @route   GET /api/audit-logs
// @access  Private/Admin
router.get('/', protect, admin, async (req, res) => {
    try {
        const pageSize = 50;
        const page = Number(req.query.pageNumber) || 1;

        const count = await AuditLog.countDocuments({});
        const logs = await AuditLog.find({})
            .populate('user', 'name username email role')
            .sort({ createdAt: -1 })
            .limit(pageSize)
            .skip(pageSize * (page - 1));

        res.json({ logs, page, pages: Math.ceil(count / pageSize), total: count });
    } catch (error) {
        console.error('Error fetching audit logs:', error);
        res.status(500).json({ message: 'Failed to fetch audit logs' });
    }
});

// @desc    Get weekly activity stats (last 7 days grouped by day)
// @route   GET /api/audit-logs/weekly-stats
// @access  Private/Admin
router.get('/weekly-stats', protect, admin, async (req, res) => {
    try {
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
        sevenDaysAgo.setHours(0, 0, 0, 0);

        const logs = await AuditLog.aggregate([
            { $match: { createdAt: { $gte: sevenDaysAgo } } },
            {
                $group: {
                    _id: {
                        day: { $dayOfWeek: '$createdAt' },
                        date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
                        action: '$action'
                    },
                    count: { $sum: 1 }
                }
            },
            { $sort: { '_id.date': 1 } }
        ]);

        // Build last 7 days array
        const days = [];
        for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            days.push({
                date: d.toISOString().split('T')[0],
                label: d.toLocaleDateString('en-GB', { weekday: 'short' }),
                uploads: 0,
                deletions: 0,
                other: 0,
                total: 0
            });
        }

        // Fill in the aggregated data
        logs.forEach(entry => {
            const dayEntry = days.find(d => d.date === entry._id.date);
            if (dayEntry) {
                if (entry._id.action === 'UPLOAD_VIDEO') {
                    dayEntry.uploads += entry.count;
                } else if (entry._id.action === 'DELETE_VIDEO') {
                    dayEntry.deletions += entry.count;
                } else {
                    dayEntry.other += entry.count;
                }
                dayEntry.total += entry.count;
            }
        });

        res.json(days);
    } catch (error) {
        console.error('Error fetching weekly stats:', error);
        res.status(500).json({ message: 'Failed to fetch weekly stats' });
    }
});

export default router;
