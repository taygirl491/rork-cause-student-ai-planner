/**
 * Import data from JSON files to MongoDB
 * Run with: node migration/importMongoDB.js
 */

require('dotenv').config();
const { connectMongoDB, closeMongoDB } = require('../mongodb');
const fs = require('fs');
const path = require('path');

// Import models
const User = require('../models/User');
const Task = require('../models/Task');
const Class = require('../models/Class');
const Note = require('../models/Note');
const Goal = require('../models/Goal');
const StudyGroup = require('../models/StudyGroup');
const Subscription = require('../models/Subscription');
const Content = require('../models/Content');

// Model mapping
const MODELS = {
    users: User,
    tasks: Task,
    classes: Class,
    notes: Note,
    goals: Goal,
    studyGroups: StudyGroup,
    subscriptions: Subscription,
    content: Content,
};

const migrationDir = path.join(__dirname, 'data');

/**
 * Import a single collection
 */
async function importCollection(collectionName, Model) {
    try {
        const filePath = path.join(migrationDir, `${collectionName}.json`);

        if (!fs.existsSync(filePath)) {
            console.log(`⚠️  Skipping ${collectionName} (file not found)`);
            return 0;
        }

        console.log(`📥 Importing ${collectionName}...`);

        const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

        if (data.length === 0) {
            console.log(`⚠️  No data to import for ${collectionName}`);
            return 0;
        }

        // Clear existing data (optional - comment out for append mode)
        await Model.deleteMany({});

        // Insert data
        const result = await Model.insertMany(data, { ordered: false });

        console.log(`✅ Imported ${result.length} documents to ${collectionName}`);
        return result.length;

    } catch (error) {
        if (error.code === 11000) {
            console.log(`⚠️  Some duplicate keys in ${collectionName}, continuing...`);
            return 0;
        }
        console.error(`❌ Error importing ${collectionName}:`, error.message);
        return 0;
    }
}

/**
 * Import all collections
 */
async function importAllCollections() {
    console.log('🚀 Starting MongoDB import...\n');

    await connectMongoDB();

    const stats = {
        total: 0,
        collections: {},
    };

    for (const [collectionName, Model] of Object.entries(MODELS)) {
        const count = await importCollection(collectionName, Model);
        stats.collections[collectionName] = count;
        stats.total += count;
    }

    console.log('\n📊 Import Summary:');
    console.log('─'.repeat(40));
    Object.entries(stats.collections).forEach(([name, count]) => {
        console.log(`  ${name.padEnd(20)} ${count} documents`);
    });
    console.log('─'.repeat(40));
    console.log(`  Total: ${stats.total} documents\n`);

    console.log('✅ Import complete!');
}

// Run import
importAllCollections()
    .then(async () => {
        console.log('🎉 MongoDB import successful!');
        await closeMongoDB();
        process.exit(0);
    })
    .catch(async (error) => {
        console.error('❌ Import failed:', error);
        await closeMongoDB();
        process.exit(1);
    });
