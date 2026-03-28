
const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const fs = require('fs');

const StudyGroup = require('../models/StudyGroup');

const migrationDir = path.join(__dirname, 'data');

async function importStudyGroups() {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected!');

        console.log('Cleaning collection...');
        await StudyGroup.deleteMany({});

        const filePath = path.join(migrationDir, 'studyGroups.json');
        const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

        const cleanedData = data.map(group => {
            const cleaned = { ...group };
            if (cleaned.createdAt && cleaned.createdAt._seconds) {
                cleaned.createdAt = new Date(cleaned.createdAt._seconds * 1000);
            }
            if (cleaned.members) {
                cleaned.members = cleaned.members.map(m => ({
                    ...m,
                    joinedAt: m.joinedAt ? new Date(m.joinedAt) : new Date()
                }));
            }
            if (!cleaned.admins) {
                cleaned.admins = [cleaned.creatorId];
            }
            return cleaned;
        });

        try {
            const result = await StudyGroup.insertMany(cleanedData, { ordered: true });
            console.log(`✅ Successfully imported ${result.length} study groups!`);
        } catch (insertError) {
            console.error('❌ FAILURE:');
            fs.writeFileSync('import-error.log', JSON.stringify(insertError, (key, value) => {
                if (key === 'op') return undefined; // Large field
                return value;
            }, 2));
            console.error('Error written to import-error.log');
        }

        await mongoose.disconnect();
    } catch (error) {
        console.error('❌ Root error:', error);
        process.exit(1);
    }
}

importStudyGroups();
