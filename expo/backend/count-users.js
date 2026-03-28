
const mongoose = require('mongoose');
require('dotenv').config();

async function check() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const userCount = await mongoose.connection.db.collection('users').countDocuments();
        console.log('USERS:' + userCount);
        await mongoose.disconnect();
    } catch (e) {
        console.log('ERROR:' + e.message);
    }
}
check();
