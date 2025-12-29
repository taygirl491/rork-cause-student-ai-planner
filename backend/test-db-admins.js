/**
 * Quick test to check if admins field is being saved to database
 */
const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connect(process.env.MONGODB_URI)
    .then(async () => {
        console.log('Connected to MongoDB\n');

        // Get the most recent group
        const StudyGroup = mongoose.model('StudyGroup', new mongoose.Schema({}, { strict: false }));
        const latestGroup = await StudyGroup.findOne().sort({ createdAt: -1 });

        console.log('Latest group from database:');
        console.log('Name:', latestGroup.name);
        console.log('Creator ID:', latestGroup.creatorId);
        console.log('Admins field exists:', 'admins' in latestGroup.toObject());
        console.log('Admins value:', latestGroup.admins);
        console.log('Admins type:', typeof latestGroup.admins);
        console.log('\nFull document:');
        console.log(JSON.stringify(latestGroup.toObject(), null, 2));

        await mongoose.connection.close();
        process.exit(0);
    })
    .catch(err => {
        console.error('Error:', err);
        process.exit(1);
    });
