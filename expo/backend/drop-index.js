
const mongoose = require('mongoose');
require('dotenv').config();

async function fix() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const db = mongoose.connection.db;
        const collection = db.collection('studygroups');

        console.log('Checking indexes...');
        const indexes = await collection.indexes();
        console.log('Indexes:', indexes.map(i => i.name).join(', '));

        if (indexes.find(i => i.name === 'inviteCode_1')) {
            console.log('Dropping inviteCode_1 index...');
            await collection.dropIndex('inviteCode_1');
            console.log('Index dropped!');
        } else {
            console.log('inviteCode_1 index not found.');
        }

        await mongoose.disconnect();
    } catch (e) {
        console.log('ERROR:' + e.message);
    }
}
fix();
