const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
require("dotenv").config();

const { db } = require("./firebase");
const emailService = require("./emailService");
const notificationService = require("./notificationService");
const { startReminderScheduler } = require("./reminderScheduler");
const { uploadFromBuffer } = require("./cloudinaryConfig");
const aiRoutes = require("./aiRoutes");
const streakRoutes = require("./streakRoutes");

const app = express();
const PORT = process.env.PORT || 3000;

// Trust proxy - required for Render and other cloud platforms
// This allows Express to trust the X-Forwarded-For header from the proxy
app.set('trust proxy', 1);


// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: "50mb" })); // Increase limit for base64 files
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Request logging
app.use((req, res, next) => {
	console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
	next();
});

// Rate limiting
const limiter = rateLimit({
	windowMs: 15 * 60 * 1000, // 15 minutes
	max: 100, // limit each IP to 100 requests per windowMs
	message: "Too many requests from this IP, please try again later.",
});
app.use("/api", limiter);

// Simple API key authentication middleware
const authenticate = (req, res, next) => {
	const apiKey = req.headers["x-api-key"];
	if (!apiKey || apiKey !== process.env.API_SECRET) {
		return res.status(401).json({ error: "Unauthorized" });
	}
	next();
};

// Health check endpoint
app.get("/health", (req, res) => {
	res.json({
		status: "OK",
		timestamp: new Date().toISOString(),
		service: "CauseAI Email Service",
	});
});

/**
 * POST /api/upload
 * Upload files to Cloudinary
 * Accepts base64 encoded files from mobile app
 */
app.post("/api/upload", authenticate, async (req, res) => {
	try {
		const { files } = req.body;

		if (!files || !Array.isArray(files) || files.length === 0) {
			return res.status(400).json({
				error: "Missing required field: files array",
			});
		}

		const uploadPromises = files.map(async (file) => {
			try {
				// file should have: { name, uri (base64 or data URI), type }
				let buffer;

				if (file.uri.startsWith("data:")) {
					// Data URI format: data:image/png;base64,iVBORw0KG...
					const base64Data = file.uri.split(",")[1];
					buffer = Buffer.from(base64Data, "base64");
				} else {
					// Already base64
					buffer = Buffer.from(file.uri, "base64");
				}

				const result = await uploadFromBuffer(buffer, file.name, file.type);

				return {
					name: file.name,
					url: result.secure_url,
					publicId: result.public_id,
					type: file.type,
					size: result.bytes,
				};
			} catch (error) {
				console.error(`Error uploading file ${file.name}:`, error);
				return {
					name: file.name,
					error: error.message,
				};
			}
		});

		const uploadedFiles = await Promise.all(uploadPromises);
		const successful = uploadedFiles.filter((f) => !f.error);
		const failed = uploadedFiles.filter((f) => f.error);

		res.json({
			success: true,
			message: `Uploaded ${successful.length}/${files.length} files`,
			files: successful,
			failed: failed.length > 0 ? failed : undefined,
		});
	} catch (error) {
		console.error("Error in file upload:", error);
		res.status(500).json({
			error: "Failed to upload files",
			details: error.message,
		});
	}
});

/**
 * POST /api/notify/group-join
 * Send email notifications when a user joins a study group
 */
app.post("/api/notify/group-join", authenticate, async (req, res) => {
	try {
		const { groupId, newMemberEmails } = req.body;

		if (!groupId || !newMemberEmails || !Array.isArray(newMemberEmails)) {
			return res.status(400).json({
				error: "Missing required fields: groupId and newMemberEmails array",
			});
		}

		// Get group data from Firestore
		const groupDoc = await db.collection("studyGroups").doc(groupId).get();
		if (!groupDoc.exists) {
			return res.status(404).json({ error: "Group not found" });
		}

		const groupData = groupDoc.data();

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
		res.status(500).json({
			error: "Failed to send notifications",
			details: error.message,
		});
	}
});

/**
 * POST /api/notify/new-message
 * Send email notifications when a new message is posted in a group
 */
app.post("/api/notify/new-message", authenticate, async (req, res) => {
	try {
		const { groupId, messageId } = req.body;

		if (!groupId || !messageId) {
			return res.status(400).json({
				error: "Missing required fields: groupId and messageId",
			});
		}

		// Get group data
		const groupDoc = await db.collection("studyGroups").doc(groupId).get();
		if (!groupDoc.exists) {
			return res.status(404).json({ error: "Group not found" });
		}

		const groupData = groupDoc.data();

		// Get message data
		const messageDoc = await db
			.collection("studyGroups")
			.doc(groupId)
			.collection("messages")
			.doc(messageId)
			.get();

		if (!messageDoc.exists) {
			return res.status(404).json({ error: "Message not found" });
		}

		const messageData = messageDoc.data();

		// Get recipients (all members except the sender)
		const recipients = groupData.members.filter(
			(member) => member.email !== messageData.senderEmail
		);

		if (recipients.length === 0) {
			return res.json({
				success: true,
				message: "No recipients to notify",
				emailsSent: 0,
			});
		}

		// Send email notifications (fire and forget to avoid blocking response)
		emailService.sendMessageNotification(
			groupData,
			messageData,
			recipients
		).catch(err => console.error("Email notification error:", err));

		// Send push notifications (fire and forget)
		notificationService.sendMessageNotification(
			{ ...groupData, id: groupId }, // Ensure ID is passed
			{ ...messageData, id: messageId }, // Ensure ID is passed
			recipients
		).catch(err => console.error("Push notification error:", err));

		res.json({
			success: true,
			message: "Message notifications initiated",
			emailsSent: "processing_async",
		});
	} catch (error) {
		console.error("Error in new-message notification:", error);
		res.status(500).json({
			error: "Failed to send notifications",
			details: error.message,
		});
	}
});

/**
 * POST /api/notify/group-created
 * Send confirmation email when a study group is created
 */
app.post("/api/notify/group-created", authenticate, async (req, res) => {
	try {
		const { groupId, creatorEmail } = req.body;

		if (!groupId || !creatorEmail) {
			return res.status(400).json({
				error: "Missing required fields: groupId and creatorEmail",
			});
		}

		// Get group data
		const groupDoc = await db.collection("studyGroups").doc(groupId).get();
		if (!groupDoc.exists) {
			return res.status(404).json({ error: "Group not found" });
		}

		const groupData = groupDoc.data();

		// Send confirmation email
		await emailService.sendGroupCreatedNotification(creatorEmail, groupData);

		res.json({
			success: true,
			message: "Group creation notification sent successfully",
		});
	} catch (error) {
		console.error("Error in group-created notification:", error);
		res.status(500).json({
			error: "Failed to send notification",
			details: error.message,
		});
	}
});

/**
 * GET /join/:code
 * Public endpoint to handle deep linking for group invites.
 * Redirects to the app if installed, or shows a fallback page.
 */
app.get("/join/:code", (req, res) => {
	const { code } = req.params;
	const deepLink = `causeai://invite/${code}`;
	// You should replace this with your actual Play Store / App Store URLs
	const downloadLink = "https://play.google.com/store/apps/details?id=com.minato.causeai";

	const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Join Study Group - CauseAI</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <meta property="og:title" content="Join my Study Group on CauseAI" />
        <meta property="og:description" content="Click to join the study group with code: ${code}" />
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; margin: 0; background-color: #f9fafb; text-align: center; padding: 20px; }
          .logo { width: 100px; height: 100px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 20px; margin-bottom: 20px; display: flex; align-items: center; justify-content: center; color: white; font-size: 40px; font-weight: bold; }
          h1 { margin-bottom: 10px; color: #1f2937; }
          p { margin-bottom: 30px; color: #6b7280; max-width: 400px; line-height: 1.5; }
          .btn { background: #667eea; color: white; padding: 15px 30px; border-radius: 30px; text-decoration: none; font-weight: bold; font-size: 18px; margin-bottom: 15px; display: inline-block; box-shadow: 0 4px 6px rgba(102, 126, 234, 0.3); transition: transform 0.1s; }
          .btn:active { transform: scale(0.98); }
          .secondary-link { color: #667eea; text-decoration: none; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="logo">C</div>
        <h1>Join Study Group</h1>
        <p>You've been invited to join a study group on CauseAI. If you have the app, the button below will open it.</p>
        
        <a id="openApp" href="${deepLink}" class="btn">Open App & Join</a>
        
        <div>
          <a href="${downloadLink}" class="secondary-link">Don't have the app? Download it here</a>
        </div>

        <script>
          // Automatic redirect attempt
          window.location.href = "${deepLink}";
          
          // Optional: If you want to detect failure and redirect to store automatically after a timeout:
          // setTimeout(function() {
          //   window.location.href = "${downloadLink}";
          // }, 2000);
        </script>
      </body>
    </html>
  `;

	res.send(html);
});

/**
 * Test endpoint to send a test email
 */
app.post("/api/test-email", authenticate, async (req, res) => {
	try {
		const { to } = req.body;

		if (!to) {
			return res.status(400).json({ error: 'Missing "to" email address' });
		}

		await emailService.transporter.sendMail({
			from: `"${process.env.FROM_NAME}" <${process.env.FROM_EMAIL}>`,
			to: to,
			subject: "CauseAI Email Service Test",
			html: "<h1>Success!</h1><p>Your email service is working correctly.</p>",
			text: "Success! Your email service is working correctly.",
		});

		res.json({
			success: true,
			message: "Test email sent successfully",
		});
	} catch (error) {
		console.error("Error sending test email:", error);
		res.status(500).json({
			error: "Failed to send test email",
			details: error.message,
		});
	}
});

// AI Routes
app.use("/api/ai", authenticate, aiRoutes);

// Streak Routes
app.use("/api/streak", authenticate, streakRoutes);

// 404 handler
app.use((req, res) => {
	res.status(404).json({ error: "Endpoint not found" });
});

// Error handler
app.use((err, req, res, next) => {
	console.error("Server error:", err);
	res.status(500).json({
		error: "Internal server error",
		details: process.env.NODE_ENV === "development" ? err.message : undefined,
	});
});

// Start server
app.listen(PORT, "0.0.0.0", () => {
	console.log(`
╔═══════════════════════════════════════════╗
║   CauseAI Email Service                   ║
║   Server running on port ${PORT}            ║
║   Accessible at: http://localhost:${PORT}   ║
║   From Android: http://10.0.2.2:${PORT}    ║
║   Environment: ${process.env.NODE_ENV || "development"}                ║
╚═══════════════════════════════════════════╝
  `);

	// Start the reminder scheduler
	startReminderScheduler();
});

module.exports = app;
