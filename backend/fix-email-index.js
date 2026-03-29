
const mongoose = require('mongoose');
require('dotenv').config();

async function fix() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const db = mongoose.connection.db;
        const collection = db.collection('studygroups');

        const indexes = await collection.indexes();
        console.log('Indexes before:', indexes.map(i => i.name).join(', '));

        if (indexes.find(i => i.name === 'members.email_1')) {
            console.log('Dropping members.email_1 index...');
            await collection.dropIndex('members.email_1');
            console.log('Index dropped!');
        }

        console.log('Re-creating non-unique index on members.email...');
        await collection.createIndex({ 'members.email': 1 });
        console.log('Index created!');

        await mongoose.disconnect();
    } catch (e) {
        console.log('ERROR:' + e.message);
    }
}
fix();
