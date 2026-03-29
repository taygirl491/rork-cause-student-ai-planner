/**
 * Test MongoDB Atlas Connection
 * Run with: node testConnection.js
 */

require('dotenv').config();
const { connectMongoDB, getConnectionStatus, closeMongoDB } = require('./mongodb');

async function testConnection() {
    console.log('🔄 Testing MongoDB Atlas connection...\n');

    try {
        // Test connection
        await connectMongoDB();

        const status = getConnectionStatus();
        console.log('📊 Connection Status:', {
            isConnected: status.isConnected,
            readyState: status.readyState,
            readyStateText: getReadyStateText(status.readyState),
        });

        // Test database operations
        const User = require('./models/User');

        console.log('\n✅ Connection successful!');
        console.log('✅ User model loaded');
        console.log('✅ Database:', process.env.MONGODB_DB_NAME || 'cause-student-planner');

        // List collections
        const mongoose = require('mongoose');
        const collections = await mongoose.connection.db.listCollections().toArray();
        console.log('\n📁 Collections:', collections.map(c => c.name).join(', ') || 'None yet');

        console.log('\n🎉 MongoDB Atlas is ready for migration!');

    } catch (error) {
        console.error('\n❌ Connection failed:', error.message);
        console.error('\n💡 Troubleshooting:');
        console.error('   1. Check MONGODB_URI in .env file');
        console.error('   2. Verify password is correct (no special characters issues)');
        console.error('   3. Ensure IP is whitelisted in MongoDB Atlas');
        console.error('   4. Check network connection');
    } finally {
        await closeMongoDB();
        console.log('\n👋 Connection closed');
        process.exit(0);
    }
}

function getReadyStateText(state) {
    const states = {
        0: 'disconnected',
        1: 'connected',
        2: 'connecting',
        3: 'disconnecting',
    };
    return states[state] || 'unknown';
}

// Run test
testConnection();
