
const mongoose = require('mongoose');
require('dotenv').config();
const User = require('./models/User');

async function check() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const user = await User.findOne({ email: 'emmaeluwa2021@gmail.com' });
        console.log('USER_TIER:' + (user ? user.tier : 'NOT_FOUND'));
        console.log('USER_DETAILS:' + JSON.stringify(user, null, 2));
        await mongoose.disconnect();
    } catch (e) {
        console.log('ERROR:' + e.message);
    }
}
check();
