import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Stock from './models/Stock.js';

dotenv.config();

const checkCount = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        const stocks = await Stock.find({});
        console.log(`Total Documents: ${stocks.length}`);
        stocks.forEach((s, i) => {
            console.log(`Doc ${i}: ID=${s._id}, AdvertiserID=${s.advertiserId}, Count=${s.stockData?.length}, LastSync=${s.lastSyncTime}`);
        });
        process.exit();
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
};

checkCount();
