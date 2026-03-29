// Quick test to check if User.find() is working
require('dotenv').config();
const { connectMongoDB } = require('./mongodb');
const User = require('./models/User');

async function testUserQuery() {
    console.log('Testing User.find() query...\n');

    try {
        console.log('Connecting to MongoDB...');
        await connectMongoDB();
        console.log('✓ Connected\n');

        console.log('Running User.find({}, "email")...');
        const startTime = Date.now();

        const users = await User.find({}, 'email');

        const duration = Date.now() - startTime;
        console.log(`✓ Query completed in ${duration}ms`);
        console.log(`✓ Found ${users.length} users`);

        if (users.length > 0) {
            console.log('\nFirst 3 users:');
            users.slice(0, 3).forEach((u, i) => {
                console.log(`  ${i + 1}. ${u.email}`);
            });
        }

        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error(error.stack);
        process.exit(1);
    }
}

testUserQuery();
