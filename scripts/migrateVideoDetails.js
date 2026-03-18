import dotenv from 'dotenv';
import mongoose from 'mongoose';
import connectDB from '../config/db.js';
import Video from '../models/Video.js';
import Stock from '../models/Stock.js';

dotenv.config({ path: './backend/.env' });

const run = async () => {
    try {
        await connectDB();
        console.log('Starting migration: Updating Video details from Stock...');

        const videos = await Video.find({ registration: { $exists: true } });
        const stockRecord = await Stock.findOne({ advertiserId: process.env.AUTOTRADER_ADVERTISER_ID });

        if (!stockRecord || !stockRecord.stockData) {
            console.log('No stock data found to sync from.');
            process.exit(1);
        }

        let updatedCount = 0;

        for (const video of videos) {
            if (!video.registration) continue;

            // Find matching vehicle in stockData array
            // Normalizing registration (remove spaces, uppercase)
            const videoReg = video.registration.replace(/\s+/g, '').toUpperCase();

            const matchingStock = stockRecord.stockData.find(item => {
                const stockReg = item.vehicle.registration?.replace(/\s+/g, '').toUpperCase();
                return stockReg === videoReg;
            });

            if (matchingStock) {
                // Determine if we need to update
                // We'll just overwrite vehicleDetails with the new enriched data
                // matchingStock has 'vehicle', 'features', 'techSpecs' etc directly on the item or nested?
                // In autoTraderRoutes.js, we merged details:
                // return { ...vehicle, features: ..., techSpecs: ... }
                // So 'matchingStock' IS the detailed object we want.

                // We map it to the structure Video expects.
                // Video.vehicleDetails is Mixed. We can just dump the whole matchingStock object there, 
                // OR specific fields.
                // Frontend VideoView.js uses: details.enginePowerBHP, details.features etc.
                // In autoTraderRoutes.js:
                // details = detailsResponse.data (which has techSpecs, features)
                // matchingStock is result of map: { ...vehicle, features: [], techSpecs: {}, vehicleMetrics: {}, vehicle: { ... } }

                // VideoView expects `details` to HAVE `enginePowerBHP` etc directly?
                // Wait.
                // In VideoView.js: `details.enginePowerBHP`.
                // In autoTraderRoutes.js: `detailsResponse.data` has `techSpecs`.
                // `detailsResponse.data` from AutoTrader usually has: { vehicle: {...}, techSpecs: { ... }, features: [...] }
                // But my `enrichVehicleData` returned:
                // { ...vehicle, features: details.features, techSpecs: details.techSpecs ... }

                // Wait, `details.enginePowerBHP` is likely inside `techSpecs`?
                // AutoTrader API structure:
                // /vehicles response:
                // {
                //   vehicle: { ... },
                //   techSpecs: { enginePowerBHP: 150, ... },
                //   features: [ ... ]
                // }

                // In VideoView.js I used `details.enginePowerBHP`.
                // This implies `details` is the `techSpecs` object?
                // OR I assumed flattening.

                // Let's re-read VideoView.js carefully.
                // It accesses `details.enginePowerBHP`.
                // If `details` iS the `vehicleDetails` stored on Video.
                // If `vehicleDetails` == `matchingStock` (the enriched object):
                // `matchingStock.techSpecs.enginePowerBHP`.

                // So VideoView.js might be WRONG if it expects direct access!
                // Let's check `VideoView.js` again.
                // `v(details.enginePowerBHP, ' BHP')`

                // If the data structure from AutoTrader puts it in `techSpecs`, 
                // I need to flatten it OR update VideoView.js.

                // In `autoTraderRoutes.js`:
                // cost details = detailsResponse.data;
                // return { ...vehicle, features: details.features, techSpecs: details.techSpecs ... }

                // So `enrichedStock` has `techSpecs` property.
                // So `video.vehicleDetails.techSpecs.enginePowerBHP`.

                // BUT, `VideoView.js` code I wrote was:
                // `details.enginePowerBHP`

                // If so, I need `VideoView.js` to look in `details.techSpecs.enginePowerBHP` OR I must flatten it in the backend.
                // Flattening is easier for migration script?
                // `const flattenedDetails = { ...matchingStock, ...matchingStock.techSpecs, ...matchingStock.vehicleMetrics, ...matchingStock.vehicle }`?
                // Be careful of collisions.

                // Best approach: Flatten critical Tech Specs into the root of `vehicleDetails` during migration (and in sync logic ideally, or fix frontend).
                // "details" prop passed to DigitalBrochure is `video.vehicleDetails`.

                // Let's UPDATE VideoView.js to handle nested `techSpecs` OR flatten in Backend.
                // Flattening in Backend is cleaner for the frontend component maybe?
                // Or simply fix Frontend to look safely.

                // Let's fix Frontend first? No, User is waiting.
                // I will flatten in Migration Script so correct data appears NOW.
                // And I should update `autoTraderRoutes.js` to flatten too for future syncs.

                const tech = matchingStock.techSpecs || {};
                const metrics = matchingStock.vehicleMetrics || {};
                const core = matchingStock.vehicle || {};

                const combinedDetails = {
                    ...matchingStock, // keeps features array
                    ...core,
                    ...tech,
                    ...metrics
                };

                // This puts `enginePowerBHP` at top level.

                video.vehicleDetails = combinedDetails;
                await video.save();
                updatedCount++;
                console.log(`Updated video: ${video.title} (${video.registration})`);
            }
        }

        console.log(`Migration complete. Updated ${updatedCount} videos.`);
        process.exit(0);

    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
};

run();
