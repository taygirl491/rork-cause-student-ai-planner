
const mongoose = require('mongoose');
require('dotenv').config();

async function check() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const collections = await mongoose.connection.db.listCollections().toArray();
        console.log('COLLECTIONS:' + collections.map(c => c.name).join(','));
        await mongoose.disconnect();
    } catch (e) {
        console.log('ERROR:' + e.message);
    }
}
check();
