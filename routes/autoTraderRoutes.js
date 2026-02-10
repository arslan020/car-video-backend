import express from 'express';
import axios from 'axios';
import cron from 'node-cron';
import Stock from '../models/Stock.js';
import { protect, admin } from '../middleware/authMiddleware.js';

const router = express.Router();

// Function to fetch all stock with pagination
export async function fetchAllStockFromAutoTrader() {
    try {
        const key = process.env.AUTOTRADER_KEY;
        const secret = process.env.AUTOTRADER_SECRET;
        const advertiserId = process.env.AUTOTRADER_ADVERTISER_ID;

        console.log(`[${new Date().toISOString()}] Starting AutoTrader stock sync...`);

        // Update sync status to in_progress
        await Stock.findOneAndUpdate(
            { advertiserId },
            { syncStatus: 'in_progress' },
            { upsert: true }
        );

        // 1. Get Access Token
        const tokenResponse = await axios.post(
            'https://api-sandbox.autotrader.co.uk/authenticate',
            new URLSearchParams({ key, secret }),
            {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            }
        );

        const accessToken = tokenResponse.data.access_token;

        // 2. Fetch Stock with Pagination
        let allStock = [];
        let currentPage = 1;
        let totalPages = 1;

        do {
            const stockResponse = await axios.get(
                `https://api-sandbox.autotrader.co.uk/stock?advertiserId=${advertiserId}&page=${currentPage}&pageSize=100&features=true`,
                {
                    headers: {
                        Authorization: `Bearer ${accessToken}`,
                        Accept: 'application/json'
                    }
                }
            );

            if (stockResponse.data.results) {
                // Stock API with features=true already includes all necessary data
                allStock = [...allStock, ...stockResponse.data.results];
            }

            // Update pagination info
            if (stockResponse.data.page) {
                totalPages = stockResponse.data.page.totalPages || 1;
                console.log(`Fetched page ${currentPage} of ${totalPages} (${stockResponse.data.results?.length || 0} vehicles)`);
            }

            currentPage++;
        } while (currentPage <= totalPages);

        // 3. Save to database
        await Stock.findOneAndUpdate(
            { advertiserId },
            {
                stockData: allStock,
                lastSyncTime: new Date(),
                totalVehicles: allStock.length,
                syncStatus: 'success'
            },
            { upsert: true, new: true }
        );

        console.log(`[${new Date().toISOString()}] Stock sync completed successfully! Total vehicles: ${allStock.length}`);
        return { success: true, totalVehicles: allStock.length };

    } catch (error) {
        console.error('AutoTrader sync error:', error.message);
        await Stock.findOneAndUpdate(
            { advertiserId: process.env.AUTOTRADER_ADVERTISER_ID },
            { syncStatus: 'failed' },
            { upsert: true }
        );
        return { success: false, error: error.message };
    }
}



// Initial sync disabled to comply with AutoTrader's 3 syncs per day requirement
// Stock will sync at scheduled times: 6am, 12pm, 6pm
console.log('AutoTrader sync scheduler initialized. Next sync at 6am, 12pm, or 6pm.');

// @desc    Get cached stock from database
// @route   GET /api/autotrader/stock
// @access  Private/Staff
router.get('/stock', protect, async (req, res) => {
    try {
        const advertiserId = process.env.AUTOTRADER_ADVERTISER_ID;

        let stockRecord = await Stock.findOne({ advertiserId });

        // If no stock cached yet, fetch it now
        if (!stockRecord) {
            await fetchAllStockFromAutoTrader();
            stockRecord = await Stock.findOne({ advertiserId });
        }

        res.json({
            results: stockRecord?.stockData || [],
            lastSyncTime: stockRecord?.lastSyncTime,
            totalVehicles: stockRecord?.totalVehicles || 0,
            syncStatus: stockRecord?.syncStatus || 'unknown'
        });

    } catch (error) {
        console.error('Error fetching stock:', error);
        res.status(500).json({ message: 'Failed to fetch stock' });
    }
});

// @desc    Manually trigger stock sync (Admin only)
// @route   POST /api/autotrader/sync
// @access  Private/Admin
router.post('/sync', protect, admin, async (req, res) => {
    try {
        const result = await fetchAllStockFromAutoTrader();
        res.json({
            message: result.success ? 'Stock synced successfully' : 'Stock sync failed',
            ...result
        });
    } catch (error) {
        console.error('Manual sync error:', error);
        res.status(500).json({ message: 'Failed to sync stock' });
    }
});

// @desc    Get sync status and last sync time
// @route   GET /api/autotrader/sync-status
// @access  Private
router.get('/sync-status', protect, async (req, res) => {
    try {
        const advertiserId = process.env.AUTOTRADER_ADVERTISER_ID;
        const stockRecord = await Stock.findOne({ advertiserId });

        res.json({
            lastSyncTime: stockRecord?.lastSyncTime || null,
            syncStatus: stockRecord?.syncStatus || 'unknown',
            totalVehicles: stockRecord?.totalVehicles || 0,
            nextSyncTimes: ['06:00', '12:00', '18:00']
        });
    } catch (error) {
        console.error('Error fetching sync status:', error);
        res.status(500).json({ message: 'Failed to fetch sync status' });
    }
});

// @desc    Lookup vehicle by registration (Local Cache Only)
// @route   GET /api/autotrader/lookup/:registration
// @access  Private
router.get('/lookup/:registration', protect, async (req, res) => {
    const registration = req.params.registration.replace(/\s/g, '').toUpperCase();

    try {
        // Check Local Cache (Stock Collection)
        const advertiserId = process.env.AUTOTRADER_ADVERTISER_ID;
        const stockRecord = await Stock.findOne({ advertiserId });

        if (stockRecord && stockRecord.stockData) {
            const localVehicle = stockRecord.stockData.find(item =>
                item.vehicle.registration.replace(/\s/g, '').toUpperCase() === registration
            );

            if (localVehicle) {
                console.log(`Vehicle ${registration} found in local cache.`);
                return res.json({
                    source: 'local',
                    vehicle: localVehicle.vehicle,
                    features: localVehicle.features || [],
                    media: localVehicle.media || {}
                });
            }
        }

        // Vehicle not found in local cache
        return res.status(404).json({
            message: 'Vehicle not found in stock. Please sync stock first or check registration number.'
        });

    } catch (error) {
        console.error(`Lookup failed for ${registration}:`, error.message);
        res.status(500).json({ message: 'Failed to lookup vehicle', error: error.message });
    }
});

export default router;
