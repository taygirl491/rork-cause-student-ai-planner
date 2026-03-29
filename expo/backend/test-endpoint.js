// Test the broadcast-email endpoint directly
require('dotenv').config();

const API_KEY = process.env.API_SECRET;

async function testBroadcastEndpoint() {
    console.log('🧪 Testing Broadcast Email Endpoint...\n');

    const testData = {
        subject: 'Test Broadcast',
        body: 'This is a test message from the diagnostic script.'
    };

    console.log('Request details:');
    console.log('  URL: http://localhost:3000/api/admin/broadcast-email');
    console.log('  Method: POST');
    console.log('  API Key:', API_KEY ? `***${API_KEY.slice(-4)}` : 'NOT SET');
    console.log('  Body:', testData);

    try {
        console.log('\n⏳ Sending request...');

        const response = await fetch('http://localhost:3000/api/admin/broadcast-email', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': API_KEY
            },
            body: JSON.stringify(testData)
        });

        console.log('\n✅ Response received!');
        console.log('  Status:', response.status, response.statusText);

        const result = await response.json();
        console.log('  Body:', JSON.stringify(result, null, 2));

        if (response.ok) {
            console.log('\n✅ SUCCESS! Broadcast endpoint is working.');
            console.log('Check the backend logs for email sending status.');
        } else {
            console.log('\n❌ FAILED! Server returned an error.');
        }

    } catch (error) {
        console.error('\n❌ ERROR:', error.message);
        console.error('\nPossible causes:');
        console.error('  1. Backend server is not running');
        console.error('  2. Backend is running on a different port');
        console.error('  3. Network/firewall blocking the connection');
        console.error('  4. Backend is hanging/frozen');
    }
}

testBroadcastEndpoint();
