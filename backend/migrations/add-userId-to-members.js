/**
 * Migration script to add userId to existing group members
 * This fixes members who were added before the userId field was included
 */

const mongoose = require('mongoose');
require('dotenv').config();

const StudyGroup = require('../models/StudyGroupMongo');

async function migrateAddUserIdToMembers() {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✓ Connected to MongoDB');

        // Get all study groups
        const groups = await StudyGroup.find({});
        console.log(`\nFound ${groups.length} groups to check\n`);

        let updatedCount = 0;
        let skippedCount = 0;

        for (const group of groups) {
            console.log(`\nChecking group: ${group.name}`);
            console.log(`  Creator ID: ${group.creatorId}`);
            console.log(`  Admins: ${JSON.stringify(group.admins)}`);
            console.log(`  Members count: ${group.members.length}`);

            let needsUpdate = false;

            // Check each member
            for (let i = 0; i < group.members.length; i++) {
                const member = group.members[i];

                console.log(`  Member ${i + 1}: ${member.email}`);
                console.log(`    Has userId: ${!!member.userId}`);
                console.log(`    Current userId: ${member.userId || 'MISSING'}`);

                // If member doesn't have userId
                if (!member.userId) {
                    // For the creator (first member), use creatorId
                    if (i === 0) {
                        group.members[i].userId = group.creatorId;
                        console.log(`    → Setting userId to creatorId: ${group.creatorId}`);
                        needsUpdate = true;
                    } else {
                        console.log(`    ⚠ WARNING: Non-creator member missing userId`);
                        console.log(`    → This member needs manual update or re-approval`);
                    }
                }
            }

            if (needsUpdate) {
                await group.save();
                updatedCount++;
                console.log(`  ✓ Updated group`);
            } else {
                skippedCount++;
                console.log(`  → No updates needed`);
            }
        }

        console.log('\n=== Migration Complete ===');
        console.log(`Updated: ${updatedCount} groups`);
        console.log(`Skipped: ${skippedCount} groups (already had userId)`);

    } catch (error) {
        console.error('\n❌ Migration error:');
        console.error('Error name:', error.name);
        console.error('Error message:', error.message);
        console.error('Full error:', error);
    } finally {
        await mongoose.disconnect();
        console.log('\n✓ Disconnected from MongoDB');
        process.exit(0);
    }
}

// Run migration
migrateAddUserIdToMembers();
