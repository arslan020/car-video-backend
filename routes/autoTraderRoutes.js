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
            'https://api.autotrader.co.uk/authenticate',
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
                `https://api.autotrader.co.uk/stock?advertiserId=${advertiserId}&page=${currentPage}&pageSize=100&features=true`,
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

        // Vehicle not found in local cache - Try UKVD Fallback
        console.log(`Vehicle ${registration} not in local stock. Attempting UKVD lookup...`);

        const ukvdKey = process.env.UKVD_API_KEY;
        const ukvdPackage = process.env.UKVD_PACKAGE || 'VehicleDetails';
        const ukvdEndpoint = process.env.UKVD_ENDPOINT || 'https://uk.api.vehicledataglobal.com/r2/lookup';

        if (ukvdKey) {
            try {
                // Parameters based on user's Java example
                const params = {
                    apiKey: ukvdKey,
                    packageName: ukvdPackage,
                    vrm: registration
                };

                console.log(`Calling UKVD Endpoint: ${ukvdEndpoint}`);

                const ukvdResponse = await axios.get(ukvdEndpoint, { params });
                const data = ukvdResponse.data;

                // Check for success - API uses capital case field names
                if (data && data.Results && data.Results.VehicleDetails) {
                    const vIdent = data.Results.VehicleDetails.VehicleIdentification || {};
                    const vTech = data.Results.VehicleDetails.DvlaTechnicalDetails || {};
                    const vHistory = data.Results.VehicleDetails.VehicleHistory || {};
                    const vStatus = data.Results.VehicleDetails.VehicleStatus || {};

                    // Normalize to match AutoTrader structure
                    const vehicle = {
                        registration: vIdent.Vrm || registration,
                        make: vIdent.DvlaMake,
                        model: vIdent.DvlaModel,
                        generation: vIdent.DvlaModel,
                        derivative: vIdent.DvlaBodyType || '',
                        vehicleType: 'Car',
                        trim: vIdent.DvlaModel,
                        bodyType: vIdent.DvlaBodyType,
                        fuelType: vIdent.DvlaFuelType,
                        transmissionType: '',
                        drivetrain: '',
                        colour: vHistory.ColourDetails?.CurrentColour || '',
                        engineCapacityCC: vTech.EngineCapacityCc,
                        enginePowerBHP: vTech.MaxNetPowerKw ? Math.round(vTech.MaxNetPowerKw * 1.341) : null,
                        emissionClass: 'Euro 6',
                        co2EmissionGPKM: vStatus.VehicleExciseDutyDetails?.DvlaCo2,
                        topSpeedMPH: null,
                        accelerationSeconds: null,
                        doors: null,
                        seats: vTech.NumberOfSeats,
                        firstRegistrationDate: vIdent.DateFirstRegistered,
                        yearOfManufacture: vIdent.YearOfManufacture,
                        odometerReadingMiles: null,
                        price: null,
                        images: []
                    };

                    console.log('UKVD Lookup Successful:', vehicle.make, vehicle.model);

                    return res.json({
                        source: 'ukvd',
                        vehicle: vehicle,
                        features: [],
                        media: { images: [] }
                    });
                } else if (data && data.ResponseInformation) {
                    console.warn('UKVD Lookup Failed:', data.ResponseInformation.StatusMessage);
                } else {
                    console.warn('UKVD Lookup Failed: Invalid Response Structure');
                }

            } catch (ukvdError) {
                console.error('UKVD API Error:', ukvdError.message);
                // Continue to 404
            }
        }

        return res.status(404).json({
            message: 'Vehicle not found in stock or external database.'
        });

    } catch (error) {
        console.error(`Lookup failed for ${registration}:`, error.message);
        res.status(500).json({ message: 'Failed to lookup vehicle', error: error.message });
    }
});

export default router;