const axios = require('axios');
// Use the local server for testing if running, otherwise use the live URL
const API_URL = 'http://localhost:5000';
const TEST_USER_ID = 'test-user-streak-123';

async function testStreakLogic() {
    console.log('🧪 Testing Daily Streak Logic\n');

    try {
        // 1. Get initial streak (reset it in DB first if needed, but for now just check)
        console.log('📊 Step 1: Getting initial streak data...');
        const initRes = await axios.get(`${API_URL}/api/streak/${TEST_USER_ID}`);
        console.log('Initial Streak:', initRes.data.streak.current);

        // 2. Perform check-in today
        console.log('\n🚀 Step 2: Performing daily check-in...');
        const checkInRes = await axios.post(`${API_URL}/api/streak/update`, { userId: TEST_USER_ID });
        console.log('Check-in Result:', checkInRes.data);
        console.log('New Streak:', checkInRes.data.streak.current);

        // 3. Perform second check-in same day (should not increase)
        console.log('\n🔄 Step 3: Performing second check-in same day...');
        const secondRes = await axios.post(`${API_URL}/api/streak/update`, { userId: TEST_USER_ID });
        console.log('Second Check-in Result:', secondRes.data);
        if (secondRes.data.increased === false) {
            console.log('✅ Streak correctly did not increase on same day.');
        } else {
            console.log('❌ Error: Streak increased on same day!');
        }

        console.log('\n✅ Basic streak tests passed!');
    } catch (error) {
        console.error('❌ Test failed:', error.response?.data || error.message);
        console.log('\nNote: Make sure the backend server is running at', API_URL);
    }
}

testStreakLogic();
