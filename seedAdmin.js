import mongoose from 'mongoose';
import dotenv from 'dotenv';
import connectDB from './config/db.js';
import User from './models/User.js';

dotenv.config();

connectDB();

const importData = async () => {
    try {
        await User.deleteMany();

        const adminUser = new User({
            username: 'admin',
            password: 'password123', // Default password
            role: 'admin',
            email: 'admin@hestonautomotive.com',
            phoneNumber: '07000000000'
        });

        await adminUser.save();

        console.log('Admin User Imported!');
        process.exit();
    } catch (error) {
        console.error(`${error}`);
        process.exit(1);
    }
};

importData();
