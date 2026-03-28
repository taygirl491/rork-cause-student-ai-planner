
const mongoose = require('mongoose');
require('dotenv').config();

async function check() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const collection = mongoose.connection.db.collection('studygroups');
        const indexes = await collection.indexes();
        console.log('INDEXES:' + JSON.stringify(indexes, null, 2));
        await mongoose.disconnect();
    } catch (e) {
        console.log('ERROR:' + e.message);
    }
}
check();
