require('dotenv').config();

console.log('Checking MongoDB configuration...\n');

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB_NAME;

if (!uri) {
    console.log('❌ MONGODB_URI is not set in .env file');
} else {
    // Mask the password for security
    const maskedUri = uri.replace(/:([^@]+)@/, ':****@');
    console.log('✅ MONGODB_URI is set:', maskedUri);
}

if (!dbName) {
    console.log('⚠️  MONGODB_DB_NAME is not set (will use default)');
} else {
    console.log('✅ MONGODB_DB_NAME:', dbName);
}

console.log('\nAttempting connection...');

const mongoose = require('mongoose');

async function testConnection() {
    try {
        await mongoose.connect(uri, {
            dbName: dbName || 'cause-student-planner',
            serverSelectionTimeoutMS: 10000,
        });

        console.log('✅ Successfully connected to MongoDB!');
        await mongoose.connection.close();
        process.exit(0);
    } catch (error) {
        console.error('❌ Connection failed:', error.message);
        console.error('\nPossible issues:');
        console.error('1. Check your MongoDB Atlas IP whitelist');
        console.error('2. Verify your password is correct');
        console.error('3. Check your internet connection');
        console.error('4. Verify the connection string format');
        process.exit(1);
    }
}

testConnection();
