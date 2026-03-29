/**
 * Check MongoDB collections and document counts
 * Run with: node checkMongoDB.js
 */

require('dotenv').config();
const { connectMongoDB, closeMongoDB, mongoose } = require('./mongodb');

async function checkMongoDB() {
    console.log('🔍 Checking MongoDB collections...\n');

    try {
        await connectMongoDB();

        const db = mongoose.connection.db;
        const collections = await db.listCollections().toArray();

        console.log('📁 Collections found:', collections.length);
        console.log('─'.repeat(50));

        for (const collection of collections) {
            const count = await db.collection(collection.name).countDocuments();
            console.log(`  ${collection.name.padEnd(25)} ${count} documents`);
        }

        console.log('─'.repeat(50));

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await closeMongoDB();
    }
}

checkMongoDB();
