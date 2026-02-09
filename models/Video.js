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
    publicId: {
        type: String, // Cloudinary public_id
        required: true,
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
    }
}, {
    timestamps: true,
});

const Video = mongoose.model('Video', videoSchema);
export default Video;
