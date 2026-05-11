const { safeError } = require("../utils/errorResponse");
const User = require('../models/User');
const Task = require('../models/Task');
const Class = require('../models/Class');
const Note = require('../models/Note');
const Goal = require('../models/Goal');
const StudyGroup = require('../models/StudyGroup');
const Subscription = require('../models/Subscription');

const deleteUser = async (req, res) => {
	try {
		const { userId } = req.params;

		if (!userId) {
			return res.status(400).json({
				error: "Missing required field: userId",
			});
		}

		// 0. Fetch the user first to get their email
		const userToDelete = await User.findById(userId);
		const userEmail = userToDelete?.email;

		// Get Socket.IO instance
		const io = req.app.get('io');

		// Handle study groups properly
		// 1. Find all groups where user is a member, creator, admin, or pending member
		const userGroups = await StudyGroup.find({
			$or: [
				{ creatorId: userId },
				{ admins: userId },
				{ 'members.userId': userId },
				{ 'pendingMembers.userId': userId },
				...(userEmail ? [
					{ 'members.email': userEmail },
					{ 'pendingMembers.email': userEmail }
				] : [])
			]
		});

		for (const group of userGroups) {
			console.log(`[Delete] Cleaning up user from group: ${group.name}`);

			// Remove user from members array (using both UID and email for safety)
			group.members = group.members.filter(member =>
				member.userId !== userId && (userEmail ? member.email !== userEmail : true)
			);

			// Remove user from pendingMembers array
			group.pendingMembers = group.pendingMembers.filter(member =>
				member.userId !== userId && (userEmail ? member.email !== userEmail : true)
			);

			// Remove user from admins array if present
			if (group.admins && group.admins.includes(userId)) {
				group.admins = group.admins.filter(adminId => adminId !== userId);
			}

			// If group now has no members, delete it
			if (group.members.length === 0) {
				await StudyGroup.findByIdAndDelete(group._id);
				console.log(`✓ Deleted empty group: ${group.name}`);

				// Emit group deletion event
				if (io) {
					io.to(`group-${group._id}`).emit('group-deleted', { groupId: group._id });
				}
			} else {
				// If user was the creator, transfer ownership to first remaining admin or member
				if (group.creatorId === userId) {
					// Try to transfer to first admin, otherwise first member
					if (group.admins && group.admins.length > 0) {
						group.creatorId = group.admins[0];
					} else if (group.members.length > 0) {
						group.creatorId = group.members[0].userId;
						// Also make them an admin if they have a userId
						if (group.members[0].userId) {
							if (!group.admins) group.admins = [];
							if (!group.admins.includes(group.members[0].userId)) {
								group.admins.push(group.members[0].userId);
							}
						}
					}
					console.log(`✓ Transferred ownership of group "${group.name}" to ${group.creatorId}`);
				}
				await group.save();
				console.log(`✓ Removed user from group: ${group.name}`);

				// Emit group update event to notify remaining members
				if (io) {
					io.to(`group-${group._id}`).emit('group-updated', {
						groupId: group._id,
						group: {
							_id: group._id,
							name: group.name,
							description: group.description,
							creatorId: group.creatorId,
							admins: group.admins,
							members: group.members,
							code: group.code,
							createdAt: group.createdAt,
						}
					});
				}
			}
		}

		// Delete all other user data
		await Promise.all([
			User.findByIdAndDelete(userId),
			Task.deleteMany({ userId }),
			Class.deleteMany({ userId }),
			Note.deleteMany({ userId }),
			Goal.deleteMany({ userId }),
			Subscription.deleteMany({ userId }),
		]);

		console.log(`✓ Deleted all data for user ${userId}`);

		res.json({
			success: true,
			message: "User data deleted successfully",
		});
	} catch (error) {
		console.error("Error deleting user data:", error);
		return safeError(res, 500, "Failed to delete user data", error);
	}
};

module.exports = {
    deleteUser
};
