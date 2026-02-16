import mongoose from 'mongoose';

const videoSchema = mongoose.Schema({
    uploadedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    videoUrl: {
        type: String,
        required: true,
    },
    videoSource: {
        type: String,
        enum: ['cloudinary', 'youtube', 'cloudflare'],
        default: 'cloudinary',
    },
    youtubeVideoId: {
        type: String, // YouTube video ID (e.g., 'dQw4w9WgXcQ')
    },
    cloudflareVideoId: {
        type: String, // Cloudflare Stream video ID
    },
    publicId: {
        type: String, // Cloudinary public_id (only for cloudinary videos)
    },
    originalName: {
        type: String,
    },
    title: {
        type: String,
        default: 'Untitled Video'
    },
    viewCount: {
        type: Number,
        default: 0,
    },
    registration: {
        type: String,
        uppercase: true,
        trim: true
    },
    make: {
        type: String,
        trim: true
    },
    model: {
        type: String,
        trim: true
    },
    uploadedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    vehicleDetails: {
        type: mongoose.Schema.Types.Mixed
    },
    reserveCarLink: {
        type: String,
        trim: true
    }
}, {
    timestamps: true,
});

const Video = mongoose.model('Video', videoSchema);
export default Video;