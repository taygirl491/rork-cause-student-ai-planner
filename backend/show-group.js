
const mongoose = require('mongoose');
require('dotenv').config();
const StudyGroup = require('./models/StudyGroup');

async function show() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const group = await StudyGroup.findOne({});
        console.log('GROUP:' + JSON.stringify(group, null, 2));
        await mongoose.disconnect();
    } catch (e) {
        console.log('ERROR:' + e.message);
    }
}
show();
