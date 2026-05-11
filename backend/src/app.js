const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");

const { admin } = require("./config/firebase");
const authenticate = require("./middleware/authenticate");

const aiRoutes = require("./routes/aiRoutes");
const streakRoutes = require("./routes/streakRoutes");
const tasksRoutes = require("./routes/tasksRoutes");
const classesRoutes = require("./routes/classesRoutes");
const notesRoutes = require("./routes/notesRoutes");
const goalsRoutes = require("./routes/goalsRoutes");
const studyGroupsRoutes = require("./routes/studyGroupsRoutes");
const adminRoutes = require("./routes/adminRoutes");
const userRoutes = require("./routes/userRoutes");
const gamificationRoutes = require("./routes/gamificationRoutes");
const stripeRoutes = require("./routes/stripeRoutes");

const uploadRoutes = require("./routes/uploadRoutes");
const notifyRoutes = require("./routes/notifyRoutes");
const authRoutes = require("./routes/authRoutes");

const app = express();
const server = http.createServer(app);

// Allowed origins from env — comma-separated list for CORS allowlist
const allowedOrigins = process.env.ALLOWED_ORIGINS
	? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
	: ['http://localhost:3000', 'http://localhost:8081'];

// Initialize Socket.IO
const io = new Server(server, {
	cors: {
		origin: allowedOrigins,
		methods: ["GET", "POST"],
		credentials: true
	},
	transports: ['websocket', 'polling']
});

// Socket.IO auth middleware — verify Firebase ID token on every connection
io.use(async (socket, next) => {
	const token = socket.handshake.auth?.token;
	if (!token) {
		return next(new Error('Authentication required'));
	}
	try {
		const decoded = await admin.auth().verifyIdToken(token);
		socket.data.uid = decoded.uid;
		next();
	} catch (err) {
		next(new Error('Invalid or expired Firebase token'));
	}
});

// Socket.IO connection handler
io.on('connection', (socket) => {
	console.log('✓ User connected:', socket.id, socket.data.uid ? `(uid: ${socket.data.uid})` : '(unauthenticated)');

	// Join a study group room — verify membership via MongoDB
	socket.on('join-group', async (groupId) => {
		if (socket.data.uid) {
			try {
				const StudyGroup = require('./models/StudyGroup');
				const group = await StudyGroup.findById(groupId);
				const isMember = group && (
					group.creatorId === socket.data.uid ||
					group.admins.includes(socket.data.uid) ||
					group.members.some(m => m.userId === socket.data.uid)
				);
				if (!isMember) {
					console.warn(`[Socket] User ${socket.data.uid} denied access to group-${groupId}`);
					return;
				}
			} catch (err) {
				console.error('[Socket] Group membership check failed:', err.message);
				return;
			}
		}
		socket.join(`group-${groupId}`);
		console.log(`User ${socket.id} joined group-${groupId}`);
	});

	// Leave a study group room
	socket.on('leave-group', (groupId) => {
		socket.leave(`group-${groupId}`);
		console.log(`User ${socket.id} left group-${groupId}`);
	});

	// Join a user channel — only allow joining own channel
	socket.on('join-user', (userId) => {
		if (socket.data.uid !== userId) {
			console.warn(`[Socket] User ${socket.data.uid} denied joining channel user-${userId}`);
			return;
		}
		socket.join(`user-${userId}`);
		console.log(`User ${socket.id} joined channel user-${userId}`);
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

// HTTPS redirect — production only (Render / other proxies set x-forwarded-proto)
if (process.env.NODE_ENV === 'production') {
	app.use((req, res, next) => {
		if (req.headers['x-forwarded-proto'] !== 'https') {
			return res.redirect(301, `https://${req.headers.host}${req.url}`);
		}
		next();
	});
}

// Middleware
app.use(helmet());
app.use(cors({ origin: allowedOrigins, credentials: true }));
app.use(express.json({ limit: "50mb" })); // Increase limit for base64 files
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Request logging — structured JSON audit log
app.use((req, res, next) => {
	const start = Date.now();
	res.on('finish', () => {
		const log = {
			ts: new Date().toISOString(),
			method: req.method,
			path: req.path,
			status: res.statusCode,
			ms: Date.now() - start,
			uid: req.user?.uid ?? null,
			ip: req.ip,
		};
		console.log(JSON.stringify(log));
	});
	next();
});

// Rate limiting — global catch-all (generous for Socket.IO polling)
const limiter = rateLimit({
	windowMs: 15 * 60 * 1000,
	max: 2000,
	handler: (req, res) => {
		res.status(429).json({ success: false, error: "Too many requests, please try again later." });
	}
});
app.use("/api", limiter);

// Tighter per-endpoint limiters
const authLimiter = rateLimit({
	windowMs: 15 * 60 * 1000, max: 10,
	handler: (req, res) => res.status(429).json({ success: false, error: "Too many auth requests." })
});
const adminLimiter = rateLimit({
	windowMs: 15 * 60 * 1000, max: 5,
	handler: (req, res) => res.status(429).json({ success: false, error: "Too many admin requests." })
});
const uploadLimiter = rateLimit({
	windowMs: 15 * 60 * 1000, max: 20,
	handler: (req, res) => res.status(429).json({ success: false, error: "Too many upload requests." })
});
const stripeLimiter = rateLimit({
	windowMs: 15 * 60 * 1000, max: 20,
	handler: (req, res) => res.status(429).json({ success: false, error: "Too many payment requests." })
});
const aiLimiter = rateLimit({
	windowMs: 15 * 60 * 1000, max: 30,
	handler: (req, res) => res.status(429).json({ success: false, error: "Too many AI requests." })
});

// Health check endpoint
app.get("/health", (req, res) => {
	res.json({
		status: "OK",
		timestamp: new Date().toISOString(),
		service: "CauseAI Email Service",
	});
});

/**
 * GET /join/:code
 * Public endpoint to handle deep linking for group invites.
 * Redirects to the app if installed, or shows a fallback page.
 */
app.get("/join/:code", (req, res) => {
	const { code } = req.params;
	const deepLink = `causeai://invite/${code}`;
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
          window.location.href = "${deepLink}";
        </script>
      </body>
    </html>
  `;

	res.send(html);
});

// Test endpoint to send a test email
app.post("/api/test-email", authenticate, async (req, res) => {
	try {
		const { to } = req.body;

		if (!to) {
			return res.status(400).json({ error: 'Missing "to" email address' });
		}

		const emailService = require("./services/emailService");
        
        // Use a safe fallback for the test email
        try {
            const nodemailer = require("nodemailer");
            const transporter = nodemailer.createTransport({
                host: 'smtp.gmail.com',
                port: 587,
                secure: false, // Use STARTTLS
                auth: {
                  user: process.env.GMAIL_USER,
                  pass: process.env.GMAIL_APP_PASSWORD
                }
            });
            
            await transporter.sendMail({
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
        } catch (emailErr) {
             console.error("Transport error:", emailErr);
             throw emailErr;
        }

	} catch (error) {
		console.error("Error sending test email:", error);
		const { safeError } = require("./utils/errorResponse");
		return safeError(res, 500, "Failed to send test email", error);
	}
});

// Apply specific limiters to appropriate routes
app.use("/api/upload", uploadLimiter, uploadRoutes);
app.use("/api/notify", notifyRoutes);
app.use("/api/auth", authLimiter, authRoutes);

// AI Routes
app.use("/api/ai", aiLimiter, authenticate, aiRoutes);

// Streak Routes
app.use("/api/streak", authenticate, streakRoutes);
app.use("/api/tasks", authenticate, tasksRoutes);
app.use("/api/classes", authenticate, classesRoutes);
app.use("/api/notes", authenticate, notesRoutes);
app.use("/api/goals", authenticate, goalsRoutes);
app.use("/api/study-groups", authenticate, studyGroupsRoutes);
app.use("/api/admin", adminLimiter, authenticate, adminRoutes);
app.use("/api/gamification", authenticate, gamificationRoutes);

// Stripe Routes
app.use("/api/stripe", stripeLimiter, authenticate, stripeRoutes);

// User routes (needs authenticate in the routes where not verified by firebase token)
app.use("/api/users", authenticate, userRoutes);

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

module.exports = { app, server };
