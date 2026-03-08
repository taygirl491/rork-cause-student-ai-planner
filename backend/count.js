
const mongoose = require('mongoose');
require('dotenv').config();

async function check() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const count = await mongoose.connection.db.collection('studygroups').countDocuments();
        console.log('COUNT:' + count);
        await mongoose.disconnect();
    } catch (e) {
        console.log('ERROR:' + e.message);
    }
}
check();
