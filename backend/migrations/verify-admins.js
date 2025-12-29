/**
 * Verification Script: Check if admins were added
 */

const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connect(process.env.MONGODB_URI)
    .then(async () => {
        console.log('Connected to MongoDB\n');

        const StudyGroup = mongoose.model('StudyGroup', new mongoose.Schema({}, { strict: false }));

        const groups = await StudyGroup.find({}).limit(5);

        console.log('Sample of first 5 groups:\n');
        groups.forEach((group, i) => {
            console.log(`Group ${i + 1}: ${group.name}`);
            console.log(`  Creator: ${group.creatorId}`);
            console.log(`  Admins: ${JSON.stringify(group.admins)}`);
            console.log(`  Admins length: ${group.admins?.length || 0}\n`);
        });

        await mongoose.connection.close();
        process.exit(0);
    })
    .catch(err => {
        console.error('Error:', err);
        process.exit(1);
    });
