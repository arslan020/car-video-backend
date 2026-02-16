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

export default router;
