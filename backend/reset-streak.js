const mongoose = require('mongoose');
require('dotenv').config();

const User = require('./models/User');

async function resetStreak() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        // Get all users
        const users = await User.find({});
        console.log(`Found ${users.length} users`);

        for (const user of users) {
            // Reset streak to 0 if they haven't completed any tasks
            if (user.streak && user.streak.totalTasksCompleted === 0) {
                user.streak.current = 0;
                user.streak.longest = 0;
                user.streak.lastCompletionDate = null;
                await user.save();
                console.log(`Reset streak for user ${user._id} (${user.email})`);
            }
        }

        console.log('Streak reset complete!');
        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

resetStreak();
