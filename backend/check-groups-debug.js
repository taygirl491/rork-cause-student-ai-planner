
const mongoose = require('mongoose');
require('dotenv').config();

const StudyGroup = require('./models/StudyGroup');

async function checkGroups() {
    try {
        console.log('Connecting to MongoDB...');
        // Use the URI from .env if available, or fallback
        const uri = process.env.MONGODB_URI;
        if (!uri) {
            console.error('MONGODB_URI not found in environment');
            return;
        }

        await mongoose.connect(uri);
        console.log('Connected!');

        const count = await StudyGroup.countDocuments();
        console.log('\nTotal Study Groups in MongoDB:', count);

        // Check for specific user's groups
        const targetUserId = '97PoWnLF70TKSiHxitFFumLRJg13';
        const targetEmail = 'emmaeluwa2021@gmail.com';

        const userGroups = await StudyGroup.find({
            $or: [
                { creatorId: targetUserId },
                { 'members.email': targetEmail }
            ]
        });

        console.log(`\nGroups for User ${targetEmail} (${targetUserId}):`, userGroups.length);
        userGroups.forEach(g => {
            console.log(`- ${g.name} (${g.className}) | Code: ${g.code} | Created: ${g.createdAt}`);
        });

        if (userGroups.length === 0) {
            console.log('\nNo groups found for this user in MongoDB.');

            // List ALL groups just in case
            const allGroups = await StudyGroup.find({}).limit(10);
            console.log('\nFirst 10 groups in DB:');
            allGroups.forEach(g => {
                console.log(`- ${g.name} | Creator: ${g.creatorId}`);
            });
        }

        await mongoose.disconnect();
    } catch (error) {
        console.error('Error:', error);
    }
}

checkGroups();
