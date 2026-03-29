const mongoose = require('mongoose');

let isConnected = false;

/**
 * Connect to MongoDB Atlas
 */
async function connectMongoDB() {
    if (isConnected) {
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
            // Connection options
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000,
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

            // Attempt to reconnect after 5 seconds
            setTimeout(async () => {
                try {
                    console.log('🔄 Reconnecting to MongoDB...');
                    await mongoose.connect(uri, {
                        dbName: process.env.MONGODB_DB_NAME || 'cause-student-planner',
                        serverSelectionTimeoutMS: 5000,
                        socketTimeoutMS: 45000,
                    });
                    isConnected = true;
                    console.log('✅ Reconnected to MongoDB');
                } catch (reconnectError) {
                    console.error('❌ Reconnection failed:', reconnectError);
                }
            }, 5000);
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
