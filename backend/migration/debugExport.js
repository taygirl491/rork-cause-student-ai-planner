/**
 * Debug: Check exported JSON files
 * Run with: node migration/debugExport.js
 */

const fs = require('fs');
const path = require('path');

const migrationDir = path.join(__dirname, 'data');

const files = [
    'users.json',
    'tasks.json',
    'classes.json',
    'notes.json',
    'goals.json',
    'studyGroups.json',
];

console.log('🔍 Checking exported JSON files...\n');

files.forEach(filename => {
    const filePath = path.join(migrationDir, filename);

    if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf8');
        const data = JSON.parse(content);

        console.log(`📄 ${filename}`);
        console.log(`   Documents: ${data.length}`);

        if (data.length > 0) {
            console.log(`   First document keys:`, Object.keys(data[0]).join(', '));
            console.log(`   Sample _id:`, data[0]._id);
        }
        console.log('');
    } else {
        console.log(`❌ ${filename} - NOT FOUND\n`);
    }
});
