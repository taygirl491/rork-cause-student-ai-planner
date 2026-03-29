require('dotenv').config();
const mongoose = require('mongoose');

/**
 * Migration Script: Fix Email Index
 * 
 * This script fixes the duplicate key error on the email field by:
 * 1. Dropping the existing non-sparse unique index
 * 2. Creating a new sparse unique index that allows multiple null values
 */

async function fixEmailIndex() {
    try {
        console.log('🔧 Starting email index migration...\n');

        // Connect to MongoDB
        const mongoUri = process.env.MONGODB_URI;
        if (!mongoUri) {
            throw new Error('MONGODB_URI environment variable is not set');
        }

        console.log('📡 Connecting to MongoDB...');
        await mongoose.connect(mongoUri);
        console.log('✓ Connected to MongoDB\n');

        // Get the User collection
        const db = mongoose.connection.db;
        const usersCollection = db.collection('users');

        // Get existing indexes
        console.log('📋 Checking existing indexes...');
        const indexes = await usersCollection.indexes();
        console.log('Current indexes:', JSON.stringify(indexes, null, 2));

        // Check if email_1 index exists
        const emailIndexExists = indexes.some(index => index.name === 'email_1');

        if (emailIndexExists) {
            console.log('\n🗑️  Dropping old email_1 index...');
            await usersCollection.dropIndex('email_1');
            console.log('✓ Dropped old email_1 index');
        } else {
            console.log('\n⚠️  email_1 index not found (may have been already dropped)');
        }

        // Create new sparse unique index
        console.log('\n🔨 Creating new sparse unique index on email...');
        await usersCollection.createIndex(
            { email: 1 },
            {
                unique: true,
                sparse: true,
                name: 'email_1'
            }
        );
        console.log('✓ Created new sparse unique index');

        // Verify the new index
        console.log('\n🔍 Verifying new index...');
        const newIndexes = await usersCollection.indexes();
        const newEmailIndex = newIndexes.find(index => index.name === 'email_1');

        if (newEmailIndex && newEmailIndex.sparse === true) {
            console.log('✓ Index verification successful!');
            console.log('New email index:', JSON.stringify(newEmailIndex, null, 2));
        } else {
            console.log('⚠️  Warning: Index may not be configured correctly');
            console.log('New email index:', JSON.stringify(newEmailIndex, null, 2));
        }

        // Test: Try to create multiple users with null email
        console.log('\n🧪 Testing: Creating users with null email...');
        const User = require('../models/User');

        const testUserId1 = 'test_user_' + Date.now() + '_1';
        const testUserId2 = 'test_user_' + Date.now() + '_2';

        try {
            await User.create({ _id: testUserId1, streak: { current: 0, longest: 0 } });
            console.log('✓ Created first user with null email');

            await User.create({ _id: testUserId2, streak: { current: 0, longest: 0 } });
            console.log('✓ Created second user with null email');

            // Clean up test users
            await User.deleteMany({ _id: { $in: [testUserId1, testUserId2] } });
            console.log('✓ Cleaned up test users');
        } catch (error) {
            console.error('✗ Test failed:', error.message);
            // Clean up any created test users
            await User.deleteMany({ _id: { $in: [testUserId1, testUserId2] } });
        }

        console.log('\n✅ Migration completed successfully!\n');

    } catch (error) {
        console.error('\n❌ Migration failed:', error);
        throw error;
    } finally {
        // Close connection
        await mongoose.connection.close();
        console.log('📡 Disconnected from MongoDB');
    }
}

// Run the migration
if (require.main === module) {
    fixEmailIndex()
        .then(() => {
            console.log('\n🎉 All done!');
            process.exit(0);
        })
        .catch((error) => {
            console.error('\n💥 Migration failed with error:', error);
            process.exit(1);
        });
}

module.exports = { fixEmailIndex };
