import mongoose from 'mongoose';

const stockSchema = new mongoose.Schema({
    advertiserId: {
        type: String,
        required: true
    },
    stockData: {
        type: Array,
        default: []
    },
    lastSyncTime: {
        type: Date,
        default: Date.now
    },
    totalVehicles: {
        type: Number,
        default: 0
    },
    syncStatus: {
        type: String,
        enum: ['success', 'failed', 'in_progress'],
        default: 'success'
    }
}, {
    timestamps: true
});

// Ensure only one stock record per advertiser
stockSchema.index({ advertiserId: 1 }, { unique: true });

const Stock = mongoose.model('Stock', stockSchema);

export default Stock;
