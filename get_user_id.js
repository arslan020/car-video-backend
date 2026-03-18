import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './models/User.js';

dotenv.config();

const getUserId = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        const user = await User.findOne();
        if (user) {
            console.log(`User ID: ${user._id}`);
        } else {
            console.log('No users found');
        }
        process.exit();
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
};

getUserId();
