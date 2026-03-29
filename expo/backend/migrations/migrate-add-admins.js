/**
 * Migration Script: Add Admins to Existing Study Groups
 * 
 * This script updates all existing study groups to:
 * 1. Add the creator as the first admin
 * 2. Initialize pendingMembers as empty array if not present
 * 
 * Run this once to migrate existing data.
 */

const mongoose = require('mongoose');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
    .then(() => console.log('✓ Connected to MongoDB'))
    .catch(err => {
        console.error('✗ MongoDB connection error:', err);
        process.exit(1);
    });

// Define the StudyGroup schema (minimal version for migration)
const studyGroupSchema = new mongoose.Schema({
    _id: String,
    name: String,
    creatorId: String,
    admins: [String],
    pendingMembers: [{
        email: String,
        name: String,
        userId: String,
        requestedAt: Date,
    }],
}, { timestamps: false, _id: false });

const StudyGroup = mongoose.model('StudyGroup', studyGroupSchema);

async function migrateStudyGroups() {
    try {
        console.log('\n🔄 Starting migration...\n');

        // Find all groups that don't have admins or have empty admins
        const groupsToUpdate = await StudyGroup.find({
            $or: [
                { admins: { $exists: false } },
                { admins: { $size: 0 } }
            ]
        });

        console.log(`Found ${groupsToUpdate.length} groups to migrate\n`);

        let successCount = 0;
        let errorCount = 0;

        for (const group of groupsToUpdate) {
            try {
                // Update the group to add creator as admin
                await StudyGroup.updateOne(
                    { _id: group._id },
                    {
                        $set: {
                            admins: [group.creatorId],
                            pendingMembers: group.pendingMembers || []
                        }
                    }
                );

                console.log(`✓ Updated group: ${group.name} (ID: ${group._id})`);
                console.log(`  - Added admin: ${group.creatorId}`);
                successCount++;
            } catch (error) {
                console.error(`✗ Error updating group ${group.name}:`, error.message);
                errorCount++;
            }
        }

        console.log('\n📊 Migration Summary:');
        console.log(`   ✓ Successfully updated: ${successCount} groups`);
        console.log(`   ✗ Errors: ${errorCount} groups`);
        console.log('\n✅ Migration complete!\n');

    } catch (error) {
        console.error('✗ Migration failed:', error);
    } finally {
        await mongoose.connection.close();
        console.log('✓ Database connection closed');
        process.exit(0);
    }
}

// Run the migration
migrateStudyGroups();
