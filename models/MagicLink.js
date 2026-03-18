import mongoose from 'mongoose';

const magicLinkSchema = mongoose.Schema({
    token: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    video: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Video',
        required: true
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    expiresAt: {
        type: Date,
        required: true
    }
}, {
    timestamps: true
});

// TTL Index - Automatically delete documents 0 seconds after 'expiresAt'
magicLinkSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const MagicLink = mongoose.model('MagicLink', magicLinkSchema);

export default MagicLink;
