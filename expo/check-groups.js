
const mongoose = require('mongoose');
require('dotenv').config({ path: './backend/.env' });

const StudyGroup = require('./backend/models/StudyGroup');

async function checkGroups() {
    try {
        console.log('Connecting to:', process.env.MONGODB_URI);
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected!');

        const count = await StudyGroup.countDocuments();
        console.log('Total Study Groups in MongoDB:', count);

        const groups = await StudyGroup.find({}, 'name className creatorId createdAt');
        console.log('Groups:');
        groups.forEach(g => {
            console.log(`- ${g.name} (${g.className}) | Creator: ${g.creatorId} | Created: ${g.createdAt}`);
        });

        await mongoose.disconnect();
    } catch (error) {
        console.error('Error:', error);
    }
}

checkGroups();
