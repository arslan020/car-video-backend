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
                `https://api-sandbox.autotrader.co.uk/stock?advertiserId=${advertiserId}&page=${currentPage}&pageSize=100`,
                {
                    headers: {
                        Authorization: `Bearer ${accessToken}`,
                        Accept: 'application/json'
                    }
                }
            );

            if (stockResponse.data.results) {
                // Enrich stock data with detailed specs (Features, Metrics)
                const enrichedResults = await Promise.all(stockResponse.data.results.map(async (vehicle) => {
                    try {
                        const reg = vehicle.vehicle.registration;
                        if (!reg) return vehicle; // Skip if no reg

                        // Fetch details from /vehicles API
                        const detailsResponse = await axios.get(
                            `https://api-sandbox.autotrader.co.uk/vehicles?registration=${reg}&advertiserId=${advertiserId}&features=true&vehicleMetrics=true&techSpecs=true`,
                            {
                                headers: {
                                    Authorization: `Bearer ${accessToken}`,
                                    Accept: 'application/json'
                                }
                            }
                        );

                        // Merge details into the vehicle object
                        // We preserve the original 'vehicle' structure but add 'features', 'techSpecs', 'greenData' if available
                        const details = detailsResponse.data;

                        return {
                            ...vehicle,
                            features: details.features || [],
                            techSpecs: details.techSpecs || {}, // Assuming techSpecs comes back if available, or we parse from 'vehicle'
                            vehicleMetrics: details.vehicleMetrics || {},
                            // Ensure core vehicle data is as complete as possible
                            vehicle: { ...vehicle.vehicle, ...details.vehicle }
                        };
                    } catch (err) {
                        console.error(`Failed to fetch details for ${vehicle.vehicle?.registration}:`, err.message);
                        return vehicle; // Return basic data if enrichment fails
                    }
                }));

                allStock = [...allStock, ...enrichedResults];
            }

            // Update pagination info
            if (stockResponse.data.page) {
                totalPages = stockResponse.data.page.totalPages || 1;
                console.log(`Fetched and enriched page ${currentPage} of ${totalPages} (${stockResponse.data.results?.length || 0} vehicles)`);
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

// @desc    Lookup vehicle by registration (Local Cache -> AutoTrader API)
// @route   GET /api/autotrader/lookup/:registration
// @access  Private
router.get('/lookup/:registration', protect, async (req, res) => {
    const registration = req.params.registration.replace(/\s/g, '').toUpperCase();

    try {
        // 1. Check Local Cache (Stock Collection)
        const advertiserId = process.env.AUTOTRADER_ADVERTISER_ID;
        const stockRecord = await Stock.findOne({ advertiserId });

        if (stockRecord && stockRecord.stockData) {
            const localVehicle = stockRecord.stockData.find(item =>
                item.vehicle.registration.replace(/\s/g, '').toUpperCase() === registration
            );

            if (localVehicle) {
                console.log(`Vehicle ${registration} found in local cache.`);
                // Return in a format the frontend expects (matching Stock.js handleDirectUpload logic)
                return res.json({
                    source: 'local',
                    vehicle: localVehicle.vehicle,
                    features: localVehicle.features || [],
                    media: localVehicle.media || {}
                });
            }
        }

        // 2. If not in local cache, fetch from AutoTrader API
        console.log(`Vehicle ${registration} not in local cache. Fetching from AutoTrader API...`);

        const key = process.env.AUTOTRADER_KEY;
        const secret = process.env.AUTOTRADER_SECRET;

        // Get Access Token
        const tokenResponse = await axios.post(
            'https://api-sandbox.autotrader.co.uk/authenticate',
            new URLSearchParams({ key, secret }),
            { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
        );
        const accessToken = tokenResponse.data.access_token;

        // Fetch Vehicle Metrics/Details directly
        // Note: The main /stock endpoint lists vehicles. To lookup a specific one not in stock, 
        // we might use /vehicles?registration=... if available and permitted.
        // Based on the 'fetchAllStockFromAutoTrader' logic, we use /vehicles endpoint for enrichment.
        // Let's try to fetch it directly.

        try {
            const detailsResponse = await axios.get(
                `https://api-sandbox.autotrader.co.uk/vehicles?registration=${registration}&advertiserId=${advertiserId}&features=true&vehicleMetrics=true&techSpecs=true`,
                {
                    headers: {
                        Authorization: `Bearer ${accessToken}`,
                        Accept: 'application/json'
                    }
                }
            );

            const data = detailsResponse.data;

            // Construct the response object similar to the stock object structure
            const vehicleData = {
                vehicle: data.vehicle,
                features: data.features || [],
                techSpecs: data.techSpecs || {},
                vehicleMetrics: data.vehicleMetrics || {}
            };

            return res.json({
                source: 'api',
                ...vehicleData
            });

        } catch (apiError) {
            if (apiError.response && apiError.response.status === 404) {
                return res.status(404).json({ message: 'Vehicle not found in AutoTrader stock' });
            }
            throw apiError;
        }

    } catch (error) {
        console.error(`Lookup failed for ${registration}:`, error.message);
        res.status(500).json({ message: 'Failed to lookup vehicle', error: error.message });
    }
});

export default router;
