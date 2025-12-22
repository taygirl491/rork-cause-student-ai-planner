/**
 * Export all data from Firebase/Firestore to JSON files
 * Run with: node migration/exportFirestore.js
 */

require('dotenv').config();
const { db } = require('../firebase');
const fs = require('fs');
const path = require('path');

// Create migration directory if it doesn't exist
const migrationDir = path.join(__dirname, 'data');
if (!fs.existsSync(migrationDir)) {
    fs.mkdirSync(migrationDir, { recursive: true });
}

// Collections to export
const COLLECTIONS = [
    'users',
    'tasks',
    'classes',
    'notes',
    'goals',
    'studyGroups',
    'subscriptions',
    'content',
];

/**
 * Export a single collection
 */
async function exportCollection(collectionName) {
    try {
        console.log(`📦 Exporting ${collectionName}...`);

        const snapshot = await db.collection(collectionName).get();

        const data = snapshot.docs.map(doc => ({
            _id: doc.id,
            ...doc.data(),
        }));

        const filePath = path.join(migrationDir, `${collectionName}.json`);
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2));

        console.log(`✅ Exported ${data.length} documents from ${collectionName}`);
        return data.length;

    } catch (error) {
        console.error(`❌ Error exporting ${collectionName}:`, error.message);
        return 0;
    }
}

/**
 * Export all collections
 */
async function exportAllCollections() {
    console.log('🚀 Starting Firebase export...\n');

    const stats = {
        total: 0,
        collections: {},
    };

    for (const collectionName of COLLECTIONS) {
        const count = await exportCollection(collectionName);
        stats.collections[collectionName] = count;
        stats.total += count;
    }

    // Save export metadata
    const metadata = {
        exportDate: new Date().toISOString(),
        collections: stats.collections,
        totalDocuments: stats.total,
    };

    fs.writeFileSync(
        path.join(migrationDir, '_metadata.json'),
        JSON.stringify(metadata, null, 2)
    );

    console.log('\n📊 Export Summary:');
    console.log('─'.repeat(40));
    Object.entries(stats.collections).forEach(([name, count]) => {
        console.log(`  ${name.padEnd(20)} ${count} documents`);
    });
    console.log('─'.repeat(40));
    console.log(`  Total: ${stats.total} documents\n`);

    console.log(`✅ Export complete! Files saved to: ${migrationDir}`);
    console.log('📁 Files created:');
    COLLECTIONS.forEach(name => {
        console.log(`   - ${name}.json`);
    });
    console.log('   - _metadata.json\n');
}

// Run export
exportAllCollections()
    .then(() => {
        console.log('🎉 Firebase export successful!');
        process.exit(0);
    })
    .catch((error) => {
        console.error('❌ Export failed:', error);
        process.exit(1);
    });
