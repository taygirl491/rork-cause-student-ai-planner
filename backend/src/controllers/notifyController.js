const { safeError } = require("../utils/errorResponse");
const emailService = require("../services/emailService");
const notificationService = require("../services/notificationService");
const StudyGroup = require("../models/StudyGroup");

const notifyGroupJoin = async (req, res) => {
	try {
		const { groupId, newMemberEmails } = req.body;

		if (!groupId || !newMemberEmails || !Array.isArray(newMemberEmails)) {
			return res.status(400).json({
				error: "Missing required fields: groupId and newMemberEmails array",
			});
		}

		// Get group data from MongoDB
		const group = await StudyGroup.findById(groupId);
		if (!group) {
			return res.status(404).json({ error: "Group not found" });
		}

		const groupData = group.toObject();

		// Filter out the new members from recipients
		const existingMembers = groupData.members.filter(
			(member) => !newMemberEmails.includes(member.email)
		);

		if (existingMembers.length === 0) {
			return res.json({
				success: true,
				message: "No existing members to notify",
				emailsSent: 0,
			});
		}

		const newMembers = groupData.members.filter((member) =>
			newMemberEmails.includes(member.email)
		);

		// Send email notifications
		const result = await emailService.sendJoinNotification(
			groupData,
			newMembers,
			existingMembers
		);

		// Send push notifications (fire and forget)
		notificationService.sendJoinNotification(
			{ ...groupData, id: groupId }, // Ensure ID is passed
			newMembers,
			existingMembers
		).catch(err => console.error("Push notification error:", err));

		res.json({
			success: true,
			message: "Join notifications sent successfully",
			emailsSent: result.emailsSent,
		});
	} catch (error) {
		console.error("Error in group-join notification:", error);
		return safeError(res, 500, "Failed to send notifications", error);
	}
};

const notifyGroupCreated = async (req, res) => {
	try {
		const { groupId, creatorEmail } = req.body;

		if (!groupId || !creatorEmail) {
			return res.status(400).json({
				error: "Missing required fields: groupId and creatorEmail",
			});
		}

		// Get group data from MongoDB
		const group = await StudyGroup.findById(groupId);
		if (!group) {
			return res.status(404).json({ error: "Group not found" });
		}

		const groupData = group.toObject();

		// Send confirmation email
		await emailService.sendGroupCreatedNotification(creatorEmail, groupData);

		res.json({
			success: true,
			message: "Group creation notification sent successfully",
		});
	} catch (error) {
		console.error("Error in group-created notification:", error);
		return safeError(res, 500, "Failed to send notification", error);
	}
};

module.exports = {
    notifyGroupJoin,
    notifyGroupCreated
};
