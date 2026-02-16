import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

async function testProductionAPI() {
    try {
        console.log('🔍 Testing AutoTrader Production API...\n');

        const key = process.env.AUTOTRADER_KEY;
        const secret = process.env.AUTOTRADER_SECRET;
        const advertiserId = process.env.AUTOTRADER_ADVERTISER_ID;

        console.log('📋 Configuration:');
        console.log(`   Key: ${key}`);
        console.log(`   Secret: ${secret.substring(0, 10)}...`);
        console.log(`   Advertiser ID: ${advertiserId}\n`);

        // Test Authentication
        console.log('🔐 Step 1: Testing Authentication...');
        const tokenResponse = await axios.post(
            'https://api.autotrader.co.uk/authenticate',
            new URLSearchParams({ key, secret }),
            {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            }
        );

        if (tokenResponse.data.access_token) {
            console.log('✅ Authentication successful!');
            console.log(`   Token: ${tokenResponse.data.access_token.substring(0, 20)}...\n`);
        } else {
            console.log('❌ Authentication failed - no token received\n');
            return;
        }

        const accessToken = tokenResponse.data.access_token;

        // Test Stock API
        console.log('📦 Step 2: Testing Stock API...');
        const stockResponse = await axios.get(
            `https://api.autotrader.co.uk/stock?advertiserId=${advertiserId}&page=1&pageSize=10&features=true`,
            {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    Accept: 'application/json'
                }
            }
        );

        if (stockResponse.data.results) {
            console.log('✅ Stock API successful!');
            console.log(`   Total vehicles on page 1: ${stockResponse.data.results.length}`);
            console.log(`   Total pages: ${stockResponse.data.page?.totalPages || 'N/A'}`);
            console.log(`   Total vehicles: ${stockResponse.data.page?.totalResults || 'N/A'}\n`);

            if (stockResponse.data.results.length > 0) {
                const firstVehicle = stockResponse.data.results[0].vehicle;
                console.log('📋 Sample vehicle:');
                console.log(`   ${firstVehicle.make} ${firstVehicle.model}`);
                console.log(`   Registration: ${firstVehicle.registration}`);
                console.log(`   Price: £${firstVehicle.price?.toLocaleString() || 'N/A'}\n`);
            }
        } else {
            console.log('❌ Stock API failed - no results\n');
            return;
        }

        console.log('✅ All tests passed! Production API is working correctly.');
        console.log('🚀 Ready to push to production!\n');

    } catch (error) {
        console.error('❌ Test failed:', error.message);
        if (error.response) {
            console.error('   Status:', error.response.status);
            console.error('   Data:', JSON.stringify(error.response.data, null, 2));
        }
        console.log('\n⚠️  Do NOT push until this is resolved!\n');
    }
}

testProductionAPI();
