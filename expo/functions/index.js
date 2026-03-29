const functions = require("firebase-functions");
const admin = require("firebase-admin");
const sgMail = require("@sendgrid/mail");

admin.initializeApp();

// Set your SendGrid API key from Firebase config
// You'll set this using: firebase functions:config:set sendgrid.api_key="YOUR_API_KEY"
const SENDGRID_API_KEY = functions.config().sendgrid?.api_key;
if (SENDGRID_API_KEY) {
	sgMail.setApiKey(SENDGRID_API_KEY);
}

// Sender email - should be verified in SendGrid
const FROM_EMAIL =
	functions.config().sendgrid?.from_email || "noreply@causeai.app";

/**
 * Send email notification when a user joins a study group
 */
exports.notifyGroupMembersOnJoin = functions.firestore
	.document("studyGroups/{groupId}")
	.onUpdate(async (change, context) => {
		const before = change.before.data();
		const after = change.after.data();

		// Check if members array changed (someone joined)
		if (!before.members || !after.members) return null;

		const newMembers = after.members.filter(
			(afterMember) =>
				!before.members.some(
					(beforeMember) => beforeMember.email === afterMember.email
				)
		);

		if (newMembers.length === 0) return null;

		// Get existing members (excluding the new ones)
		const existingMembers = before.members.filter(
			(member) =>
				!newMembers.some((newMember) => newMember.email === member.email)
		);

		if (existingMembers.length === 0) return null;

		// Send email to existing members
		const newMemberEmails = newMembers.map((m) => m.email).join(", ");

		const emails = existingMembers.map((member) => ({
			to: member.email,
			from: FROM_EMAIL,
			subject: `New member joined ${after.name}`,
			html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2563eb;">New Member Alert!</h2>
          <p>Someone new has joined your study group <strong>${
						after.name
					}</strong>.</p>
          <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0;"><strong>New member(s):</strong> ${newMemberEmails}</p>
            <p style="margin: 10px 0 0 0;"><strong>Group:</strong> ${
							after.name
						}</p>
            <p style="margin: 5px 0 0 0;"><strong>Class:</strong> ${
							after.className || "N/A"
						}</p>
            <p style="margin: 5px 0 0 0;"><strong>School:</strong> ${
							after.school || "N/A"
						}</p>
          </div>
          <p>Open your CauseAI app to welcome them!</p>
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">
          <p style="font-size: 12px; color: #6b7280;">
            You're receiving this because you're a member of this study group.
          </p>
        </div>
      `,
			text: `New member joined ${after.name}: ${newMemberEmails}. Open your CauseAI app to see details.`,
		}));

		try {
			if (SENDGRID_API_KEY) {
				await sgMail.send(emails);
				console.log(
					`Sent join notifications for group ${context.params.groupId}`
				);
			} else {
				console.log("SendGrid API key not configured. Skipping email.");
			}
		} catch (error) {
			console.error("Error sending join notification:", error);
		}

		return null;
	});

/**
 * Send email notification when a new message is posted in a study group
 */
exports.notifyGroupMembersOnMessage = functions.firestore
	.document("studyGroups/{groupId}/messages/{messageId}")
	.onCreate(async (snap, context) => {
		const message = snap.data();
		const groupId = context.params.groupId;

		// Get the group details
		const groupDoc = await admin
			.firestore()
			.collection("studyGroups")
			.doc(groupId)
			.get();
		if (!groupDoc.exists) return null;

		const group = groupDoc.data();

		// Send email to all members except the sender
		const recipients = group.members.filter(
			(member) => member.email !== message.senderEmail
		);

		if (recipients.length === 0) return null;

		const emails = recipients.map((member) => ({
			to: member.email,
			from: FROM_EMAIL,
			subject: `New message in ${group.name}`,
			html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2563eb;">New Message in ${group.name}</h2>
          <p><strong>From:</strong> ${message.senderEmail}</p>
          <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0; white-space: pre-wrap;">${message.message}</p>
          </div>
          ${
						message.attachments && message.attachments.length > 0
							? `
            <p style="color: #6b7280; font-size: 14px;">
              📎 ${message.attachments.length} attachment(s) included
            </p>
          `
							: ""
					}
          <p>Open your CauseAI app to reply and view the full conversation.</p>
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">
          <p style="font-size: 12px; color: #6b7280;">
            You're receiving this because you're a member of this study group.
          </p>
        </div>
      `,
			text: `New message in ${group.name} from ${message.senderEmail}: ${message.message}`,
		}));

		try {
			if (SENDGRID_API_KEY) {
				await sgMail.send(emails);
				console.log(`Sent message notifications for group ${groupId}`);
			} else {
				console.log("SendGrid API key not configured. Skipping email.");
			}
		} catch (error) {
			console.error("Error sending message notification:", error);
		}

		return null;
	});

/**
 * Clean up messages when a study group is deleted
 */
exports.cleanupGroupMessages = functions.firestore
	.document("studyGroups/{groupId}")
	.onDelete(async (snap, context) => {
		const groupId = context.params.groupId;
		const batch = admin.firestore().batch();

		// Get all messages in the subcollection
		const messages = await admin
			.firestore()
			.collection("studyGroups")
			.doc(groupId)
			.collection("messages")
			.get();

		messages.docs.forEach((doc) => {
			batch.delete(doc.ref);
		});

		await batch.commit();
		console.log(`Deleted ${messages.size} messages for group ${groupId}`);

		return null;
	});
