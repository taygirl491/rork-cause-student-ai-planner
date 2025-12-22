/**
 * Test importing tasks only
 */

require('dotenv').config();
const { connectMongoDB, closeMongoDB } = require('../mongodb');
const Task = require('../models/Task');
const fs = require('fs');
const path = require('path');

async function testTaskImport() {
    try {
        await connectMongoDB();

        const filePath = path.join(__dirname, 'data', 'tasks.json');
        const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

        console.log(`Found ${data.length} tasks in file`);
        console.log('First task:', JSON.stringify(data[0], null, 2));

        // Try to insert first task
        console.log('\nTrying to insert first task...');
        const result = await Task.create(data[0]);
        console.log('✅ Success!', result._id);

    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error('Full error:', error);
    } finally {
        await closeMongoDB();
    }
}

testTaskImport();
