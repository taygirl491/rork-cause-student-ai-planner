/**
 * Check which users exist in MongoDB
 */

require('dotenv').config();
const { connectMongoDB, closeMongoDB } = require('./mongodb');
const User = require('./models/User');

async function checkUsers() {
    try {
        await connectMongoDB();

        const users = await User.find({});

        console.log(`\n📊 Found ${users.length} users in MongoDB:\n`);

        users.forEach((user, index) => {
            console.log(`${index + 1}. User ID: ${user._id}`);
            console.log(`   Email: ${user.email}`);
            console.log(`   Name: ${user.name || 'N/A'}`);
            console.log(`   Streak: ${user.streak?.current || 0} days`);
            console.log('');
        });

        if (users.length === 0) {
            console.log('⚠️  No users found in MongoDB!');
            console.log('   You may need to re-run the import script.');
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await closeMongoDB();
    }
}

checkUsers();
