import cron from 'node-cron';
import { fetchAllStockFromAutoTrader } from './routes/autoTraderRoutes.js';

const startScheduler = () => {
    // Schedule task to run at 6:00, 12:00, and 18:00 every day
    // Cron format: Minute Hour Day Month DayOfWeek
    const runSync = async () => {
        console.log(`[${new Date().toISOString()}] 🕒 Starting scheduled AutoTrader sync...`);
        try {
            const result = await fetchAllStockFromAutoTrader();
            if (result && result.success === false && result.message === 'Sync already in progress') {
                console.log(`[${new Date().toISOString()}] ⚠️ Scheduled AutoTrader sync skipped (already running).`);
            } else {
                console.log(`[${new Date().toISOString()}] ✅ Scheduled AutoTrader sync completed successfully. Processed: ${result?.totalVehicles || 0} items.`);
            }
        } catch (error) {
            console.error(`[${new Date().toISOString()}] ❌ Scheduled AutoTrader sync failed:`, error.message);
            console.error('Error stack:', error.stack);
        }
    };

    // Regular Schedule: 6:00, 12:00, 18:00
    cron.schedule('0 6,12,18 * * *', runSync);

    console.log('✅ AutoTrader Sync Scheduler started: Running at 6am, 12pm, 6pm daily (0 6,12,18 * * *).');
};

export default startScheduler;
