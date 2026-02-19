import jwt from 'jsonwebtoken';
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const testApi = async () => {
    try {
        const secret = process.env.JWT_SECRET;
        const advertiserId = process.env.AUTOTRADER_ADVERTISER_ID;

        // Generate token for a dummy admin user
        const token = jwt.sign({ id: '6989dcd26a7f4da72bb84a4e', isAdmin: true, isStaff: true }, secret, {
            expiresIn: '1h',
        });

        console.log(`Testing API with AdvertiserId: ${advertiserId}`);
        console.log(`Token generated. Calling GET http://localhost:5000/api/autotrader/stock...`);

        console.log(`Testing API Env Debug...`);

        // Check Env
        const envResponse = await axios.get('http://localhost:5000/api/autotrader/debug-env');
        console.log('ENV CHECK:');
        console.log('AdvertiserID:', envResponse.data.advertiserId);
        console.log('MongoURI:', envResponse.data.mongoUriStart);
        console.log('JWT:', envResponse.data.jwtSecretStart);
        console.log('DB Stock Count (from API):', envResponse.data.dbStockCount);
        console.log('DB Stock ID (from API):', envResponse.data.dbStockId);

        // Trigger Sync
        console.log('Triggering Sync via API...');
        const syncResponse = await axios.post('http://localhost:5000/api/autotrader/sync', {}, {
            headers: { Authorization: `Bearer ${token}` }
        });
        console.log('Sync Result:', syncResponse.data);

        process.exit();
    } catch (error) {
        console.error('API Call Failed:', error.message);
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Data:', error.response.data);
        }
        process.exit(1);
    }
};

testApi();
