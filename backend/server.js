const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
require("dotenv").config();

const { connectMongoDB } = require("./mongodb");
const emailService = require("./emailService");
const notificationService = require("./notificationService");
const { startReminderScheduler } = require("./reminderScheduler");
const { uploadFromBuffer } = require("./cloudinaryConfig");
const aiRoutes = require("./aiRoutes");
const streakRoutes = require("./streakRoutes");
const tasksRoutes = require("./routes/tasksRoutes");
const classesRoutes = require("./routes/classesRoutes");
const notesRoutes = require("./routes/notesRoutes");
const goalsRoutes = require("./routes/goalsRoutes");
const studyGroupsRoutes = require("./routes/studyGroupsRoutes");

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3000;

// Initialize Socket.IO
const io = new Server(server, {
	cors: {
		origin: "*",
		methods: ["GET", "POST"],
		credentials: true
	},
	transports: ['websocket', 'polling']
});

// Socket.IO connection handler
io.on('connection', (socket) => {
	console.log('✓ User connected:', socket.id);

	// Join a study group room
	socket.on('join-group', (groupId) => {
		socket.join(`group-${groupId}`);
		console.log(`User ${socket.id} joined group-${groupId}`);
	});

	// Leave a study group room
	socket.on('leave-group', (groupId) => {
		socket.leave(`group-${groupId}`);
		console.log(`User ${socket.id} left group-${groupId}`);
	});

	socket.on('disconnect', () => {
		console.log('✗ User disconnected:', socket.id);
	});
});

// Make io accessible to routes
app.set('io', io);

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
	max: 500, // limit each IP to 500 requests per windowMs (increased for polling)
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

		// Get group data from MongoDB
		const StudyGroup = require('./models/StudyGroup');
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
		res.status(500).json({
			error: "Failed to send notifications",
			details: error.message,
		});
	}
});


/**
 * POST /api/auth/welcome-email
 * Send welcome email to new users on signup
 */
app.post("/api/auth/welcome-email", authenticate, async (req, res) => {
	try {
		const { email, name } = req.body;

		if (!email || !name) {
			return res.status(400).json({
				error: "Missing required fields: email and name",
			});
		}

		// Send welcome email (fire and forget to avoid blocking response)
		emailService.sendWelcomeEmail(email, name)
			.then(() => console.log(`✓ Welcome email sent to ${email}`))
			.catch(err => console.error("Welcome email error:", err));

		res.json({
			success: true,
			message: "Welcome email initiated",
		});
	} catch (error) {
		console.error("Error in welcome email endpoint:", error);
		res.status(500).json({
			error: "Failed to send welcome email",
			details: error.message,
		});
	}
});

/**
 * DELETE /api/users/:userId
 * Delete user and all associated data from MongoDB
 */
app.delete("/api/users/:userId", authenticate, async (req, res) => {
	try {
		const { userId } = req.params;

		if (!userId) {
			return res.status(400).json({
				error: "Missing required field: userId",
			});
		}

		const User = require('./models/User');
		const Task = require('./models/Task');
		const Class = require('./models/Class');
		const Note = require('./models/Note');
		const Goal = require('./models/Goal');
		const StudyGroup = require('./models/StudyGroup');
		const Subscription = require('./models/Subscription');

		// Get Socket.IO instance
		const io = req.app.get('io');

		// Handle study groups properly
		// 1. Find all groups where user is a member
		const userGroups = await StudyGroup.find({ members: userId });

		for (const group of userGroups) {
			// Remove user from members array
			group.members = group.members.filter(memberId => memberId !== userId);

			// If group now has no members, delete it
			if (group.members.length === 0) {
				await StudyGroup.findByIdAndDelete(group._id);
				console.log(`✓ Deleted empty group: ${group.name}`);

				// Emit group deletion event
				if (io) {
					io.to(`group-${group._id}`).emit('group-deleted', { groupId: group._id });
				}
			} else {
				// If user was the creator, transfer ownership to first remaining member
				if (group.createdBy === userId) {
					group.createdBy = group.members[0];
					console.log(`✓ Transferred ownership of group "${group.name}" to ${group.members[0]}`);
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
							createdBy: group.createdBy,
							members: group.members,
							inviteCode: group.inviteCode,
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
		res.status(500).json({
			error: "Failed to delete user data",
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

		// Get group data from MongoDB
		const StudyGroup = require('./models/StudyGroup');
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
app.use("/api/tasks", authenticate, tasksRoutes);
app.use("/api/classes", authenticate, classesRoutes);
app.use("/api/notes", authenticate, notesRoutes);
app.use("/api/goals", authenticate, goalsRoutes);
app.use("/api/study-groups", authenticate, studyGroupsRoutes);

// Stripe Routes
const stripeRoutes = require("./stripeRoutes");
app.use("/api/stripe", authenticate, stripeRoutes);

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

// Start server with MongoDB
async function startServer() {
	try {
		await connectMongoDB();
		server.listen(PORT, "0.0.0.0", () => {
			console.log(`
╔═══════════════════════════════════════════╗
║   CauseAI Student Planner API             ║
║   Server running on port ${PORT}            ║
║   Database: MongoDB Atlas                 ║
║   WebSocket: Socket.IO Enabled            ║
╚═══════════════════════════════════════════╝
  `);
			startReminderScheduler();
		});
	} catch (error) {
		console.error('Failed to start:', error);
		process.exit(1);
	}
}
startServer();

module.exports = app;
