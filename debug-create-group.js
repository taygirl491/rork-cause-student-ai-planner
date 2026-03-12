
const mongoose = require('mongoose');
require('dotenv').config({ path: './backend/.env' });

const StudyGroup = require('./backend/models/StudyGroup');

async function debugCreateGroup() {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected!');

        const groupId = `test_group_${Date.now()}`;
        const code = `TEST${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

        console.log('Attempting to create group...');
        const group = await StudyGroup.create({
            _id: groupId,
            name: 'Debug Group',
            className: 'DEBUG 101',
            school: 'Debug University',
            description: 'Test description',
            code: code,
            creatorId: 'test_user_id',
            isPrivate: false,
            admins: ['test_user_id'],
            members: [{
                email: 'test@example.com',
                name: 'Test User',
                userId: 'test_user_id',
                joinedAt: new Date(),
            }],
            pendingMembers: [],
        });

        console.log('Group created successfully:', JSON.stringify(group.toObject(), null, 2));

        await StudyGroup.findByIdAndDelete(groupId);
        console.log('Test group deleted.');

        await mongoose.disconnect();
    } catch (error) {
        console.error('ERROR during group creation:', error);
        if (error.name === 'ValidationError') {
            Object.keys(error.errors).forEach(field => {
                console.error(`- Field "${field}": ${error.errors[field].message}`);
            });
        }
    }
}

debugCreateGroup();
