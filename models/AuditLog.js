import mongoose from 'mongoose';

const auditLogSchema = mongoose.Schema({
    action: {
        type: String,
        required: true,
        enum: ['UPLOAD_VIDEO', 'DELETE_VIDEO', 'UPDATE_VIDEO', 'OTHER']
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    details: {
        type: String,
        required: true
    },
    targetId: {
        type: String, // Can be Video ID, User ID, etc.
        required: false
    },
    metadata: {
        type: Object, // Flexible field for extra info (e.g., registration)
        required: false
    },
    ipAddress: {
        type: String,
        required: false
    }
}, {
    timestamps: true
});

const AuditLog = mongoose.model('AuditLog', auditLogSchema);

export default AuditLog;
