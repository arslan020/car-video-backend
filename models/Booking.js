import mongoose from 'mongoose';

const bookingSchema = mongoose.Schema({
    videoId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Video',
        required: true,
    },
    customerName: {
        type: String,
        required: true,
        trim: true
    },
    customerEmail: {
        type: String,
        required: true,
        trim: true,
        lowercase: true
    },
    customerPhone: {
        type: String,
        required: true,
        trim: true
    },
    visitDate: {
        type: Date,
        required: true
    },
    visitTime: {
        type: String,
        required: true
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
    status: {
        type: String,
        enum: ['pending', 'confirmed', 'cancelled', 'completed'],
        default: 'pending'
    },
    notes: {
        type: String,
        trim: true
    }
}, {
    timestamps: true,
});

const Booking = mongoose.model('Booking', bookingSchema);
export default Booking;