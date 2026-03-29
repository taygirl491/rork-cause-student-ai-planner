
const mongoose = require('mongoose');
require('dotenv').config();

async function check() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const taskCount = await mongoose.connection.db.collection('tasks').countDocuments();
        console.log('TASKS:' + taskCount);
        await mongoose.disconnect();
    } catch (e) {
        console.log('ERROR:' + e.message);
    }
}
check();
