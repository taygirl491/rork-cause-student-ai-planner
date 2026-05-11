require("dotenv").config();
const { connectMongoDB } = require("./src/config/database");
const { startReminderScheduler } = require("./src/services/reminderScheduler");
const { server } = require("./src/app");

const PORT = process.env.PORT || 3000;

// Start server with MongoDB
async function startServer() {
	try {
		await connectMongoDB();
		server.listen(PORT, "0.0.0.0", () => {
			console.log(`
╔═══════════════════════════════════════════╗
║   Cause Planner API             ║
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
