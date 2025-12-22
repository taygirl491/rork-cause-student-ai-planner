/**
 * Verify data integrity between Firebase and MongoDB
 * Run with: node migration/verifyMigration.js
 */

require('dotenv').config();
const { db: firebaseDb } = require('../firebase');
const { connectMongoDB, closeMongoDB, mongoose } = require('../mongodb');

// Import models
const User = require('../models/User');
const Task = require('../models/Task');
const Class = require('../models/Class');
const Note = require('../models/Note');
const Goal = require('../models/Goal');
const StudyGroup = require('../models/StudyGroup');
const Subscription = require('../models/Subscription');
const Content = require('../models/Content');

const COLLECTIONS = [
    { name: 'users', firestore: 'users', model: User },
    { name: 'tasks', firestore: 'tasks', model: Task },
    { name: 'classes', firestore: 'classes', model: Class },
    { name: 'notes', firestore: 'notes', model: Note },
    { name: 'goals', firestore: 'goals', model: Goal },
    { name: 'studyGroups', firestore: 'studyGroups', model: StudyGroup },
    { name: 'subscriptions', firestore: 'subscriptions', model: Subscription },
    { name: 'content', firestore: 'content', model: Content },
];

/**
 * Compare record counts
 */
async function compareRecordCounts() {
    console.log('📊 Comparing record counts...\n');

    const results = [];

    for (const collection of COLLECTIONS) {
        const firestoreCount = (await firebaseDb.collection(collection.firestore).get()).size;
        const mongoCount = await collection.model.countDocuments();

        const match = firestoreCount === mongoCount;
        const status = match ? '✅' : '❌';

        console.log(`${status} ${collection.name.padEnd(20)} Firebase: ${firestoreCount}, MongoDB: ${mongoCount}`);

        results.push({
            collection: collection.name,
            firebase: firestoreCount,
            mongodb: mongoCount,
            match,
        });
    }

    return results;
}

/**
 * Sample data comparison
 */
async function compareSampleData(collectionName, firestoreCollection, Model, sampleSize = 5) {
    console.log(`\n🔍 Comparing sample data for ${collectionName}...`);

    const firestoreDocs = await firebaseDb.collection(firestoreCollection).limit(sampleSize).get();

    let matches = 0;
    let mismatches = 0;

    for (const doc of firestoreDocs.docs) {
        const mongoDoc = await Model.findById(doc.id);

        if (mongoDoc) {
            matches++;
            console.log(`  ✅ ${doc.id} - Found in MongoDB`);
        } else {
            mismatches++;
            console.log(`  ❌ ${doc.id} - Missing in MongoDB`);
        }
    }

    return { matches, mismatches };
}

/**
 * Run full verification
 */
async function verifyMigration() {
    console.log('🔄 Starting migration verification...\n');
    console.log('='.repeat(50));

    await connectMongoDB();

    // Step 1: Compare counts
    const countResults = await compareRecordCounts();

    // Step 2: Sample data comparison
    console.log('\n' + '='.repeat(50));
    for (const collection of COLLECTIONS) {
        await compareSampleData(collection.name, collection.firestore, collection.model);
    }

    // Summary
    console.log('\n' + '='.repeat(50));
    console.log('📋 Verification Summary:');
    console.log('='.repeat(50));

    const allMatch = countResults.every(r => r.match);

    if (allMatch) {
        console.log('✅ All collections match!');
        console.log('✅ Migration verification PASSED');
    } else {
        console.log('❌ Some collections do not match');
        console.log('⚠️  Migration verification FAILED');
        console.log('\nMismatches:');
        countResults.filter(r => !r.match).forEach(r => {
            console.log(`  - ${r.collection}: Firebase=${r.firebase}, MongoDB=${r.mongodb}`);
        });
    }

    console.log('='.repeat(50));
}

// Run verification
verifyMigration()
    .then(async () => {
        await closeMongoDB();
        process.exit(0);
    })
    .catch(async (error) => {
        console.error('❌ Verification failed:', error);
        await closeMongoDB();
        process.exit(1);
    });
