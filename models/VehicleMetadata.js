import mongoose from 'mongoose';

const vehicleMetadataSchema = new mongoose.Schema({
    registration: {
        type: String,
        required: true,
        unique: true,
        uppercase: true,
        trim: true
    },
    reserveLink: {
        type: String,
        trim: true
    }
}, {
    timestamps: true
});

const VehicleMetadata = mongoose.model('VehicleMetadata', vehicleMetadataSchema);

export default VehicleMetadata;
