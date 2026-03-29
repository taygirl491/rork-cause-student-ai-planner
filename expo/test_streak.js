const mongoose = require('mongoose');
require('dotenv').config();
const { updateStreak, getStreakData } = require('./backend/streakService');
const User = require('./backend/models/User');

async function test() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        const testUserId = 'test-user-' + Date.now();
        console.log('Testing with user:', testUserId);

        // 1. Initial check-in (Day 1)
        console.log('\n--- Day 1 Check-in ---');
        const res1 = await updateStreak(testUserId);
        console.log('Res 1:', JSON.stringify(res1, null, 2));

        if (res1.streak.current !== 1) throw new Error('Streak should be 1');

        // 2. Refresh (Same day)
        console.log('\n--- Same Day Refresh ---');
        const res2 = await updateStreak(testUserId);
        console.log('Res 2 (increased should be false):', res2.increased);
        if (res2.increased !== false) throw new Error('Streak should not increase twice same day');

        // 3. Simulate Day 2 by manually setting lastCompletionDate to yesterday
        console.log('\n--- Simulating Day 2 ---');
        const today = new Date().toISOString().split('T')[0];
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split('T')[0];

        await User.findByIdAndUpdate(testUserId, {
            'streak.lastCompletionDate': yesterdayStr
        });
        console.log('Set lastCompletionDate to:', yesterdayStr);

        const res3 = await updateStreak(testUserId);
        console.log('Res 3:', JSON.stringify(res3, null, 2));
        if (res3.streak.current !== 2) throw new Error('Streak should be 2');
        if (res3.increased !== true) throw new Error('Increased should be true');

        // Clean up
        await User.findByIdAndDelete(testUserId);
        console.log('\nTest passed! Cleaning up...');
        process.exit(0);
    } catch (error) {
        console.error('Test failed:', error);
        process.exit(1);
    }
}

test();
