/**
 * Test importing users one by one to see which ones fail
 */

require('dotenv').config();
const { connectMongoDB, closeMongoDB } = require('../mongodb');
const User = require('../models/User');
const fs = require('fs');
const path = require('path');

async function testUserImport() {
    try {
        await connectMongoDB();

        const filePath = path.join(__dirname, 'data', 'users.json');
        const users = JSON.parse(fs.readFileSync(filePath, 'utf8'));

        console.log(`\n📥 Testing import of ${users.length} users...\n`);

        let successCount = 0;
        let errorCount = 0;

        for (const userData of users) {
            try {
                console.log(`Importing user: ${userData.email} (ID: ${userData._id})`);

                // Try to create the user
                await User.create(userData);

                console.log(`  ✅ Success!\n`);
                successCount++;
            } catch (error) {
                console.log(`  ❌ Failed: ${error.message}\n`);
                errorCount++;
            }
        }

        console.log(`\n📊 Results:`);
        console.log(`  ✅ Successful: ${successCount}`);
        console.log(`  ❌ Failed: ${errorCount}`);

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await closeMongoDB();
    }
}

testUserImport();
