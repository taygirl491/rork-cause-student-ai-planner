const mongoose = require('mongoose');

let isConnected = false;

/**
 * Connect to MongoDB Atlas
 */
async function connectMongoDB() {
    // Use readyState (1 = connected) rather than a local flag —
    // the flag can go stale when Atlas silently drops idle connections
    if (mongoose.connection.readyState === 1) {
        console.log('✅ Using existing MongoDB connection');
        return;
    }

    try {
        const uri = process.env.MONGODB_URI;

        if (!uri) {
            throw new Error('MONGODB_URI environment variable is not set');
        }

        await mongoose.connect(uri, {
            dbName: process.env.MONGODB_DB_NAME || 'cause-student-planner',
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000,
            // Send a heartbeat every 10s to keep the TCP connection alive
            // through Atlas's idle connection timeout (~30 min)
            heartbeatFrequencyMS: 10000,
            // Recycle idle sockets after 60s — before Atlas silently closes them
            maxIdleTimeMS: 60000,
            // Always keep at least 1 connection warm so the first request
            // after a long idle period doesn't wait for a new connection
            minPoolSize: 1,
        });

        isConnected = true;
        console.log('✅ Connected to MongoDB Atlas');

        // Handle connection events
        mongoose.connection.on('error', (err) => {
            console.error('❌ MongoDB connection error:', err);
            isConnected = false;
        });

        mongoose.connection.on('disconnected', () => {
            console.log('⚠️  MongoDB disconnected - attempting to reconnect...');
            isConnected = false;
            // Mongoose handles reconnection automatically via its built-in
            // retry logic when minPoolSize > 0. No manual setTimeout needed.
        });

    } catch (error) {
        console.error('❌ Failed to connect to MongoDB:', error);
        throw error;
    }
}

/**
 * Get MongoDB connection status
 */
function getConnectionStatus() {
    return {
        isConnected,
        readyState: mongoose.connection.readyState,
        // 0 = disconnected, 1 = connected, 2 = connecting, 3 = disconnecting
    };
}

/**
 * Close MongoDB connection
 */
async function closeMongoDB() {
    if (isConnected) {
        await mongoose.connection.close();
        isConnected = false;
        console.log('MongoDB connection closed');
    }
}

module.exports = {
    connectMongoDB,
    getConnectionStatus,
    closeMongoDB,
    mongoose,
};
