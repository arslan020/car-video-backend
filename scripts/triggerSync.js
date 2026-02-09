import dotenv from 'dotenv';
import mongoose from 'mongoose';
import connectDB from '../config/db.js';
import { fetchAllStockFromAutoTrader } from '../routes/autoTraderRoutes.js';

dotenv.config({ path: './backend/.env' });

const run = async () => {
    try {
        await connectDB();
        console.log('Triggering manual AutoTrader sync...');
        const result = await fetchAllStockFromAutoTrader();
        console.log('Sync complete:', result);
        // Force exit as DB connection might stay open
        process.exit(0);
    } catch (error) {
        console.error('Sync failed:', error);
        process.exit(1);
    }
};

run();
