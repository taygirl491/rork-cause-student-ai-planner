const admin = require("firebase-admin");
const path = require("path");

// Initialize Firebase Admin
let serviceAccount;

try {
	if (process.env.FIREBASE_SERVICE_ACCOUNT) {
		// Use environment variable if available (Render)
		serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
	} else {
		// Fallback to local file
		const serviceAccountPath =
			process.env.FIREBASE_SERVICE_ACCOUNT_PATH ||
			path.join(__dirname, "serviceAccountKey.json");
		serviceAccount = require(serviceAccountPath);
	}

	admin.initializeApp({
		credential: admin.credential.cert(serviceAccount),
	});

	console.log("✓ Firebase Admin initialized successfully");
} catch (error) {
	console.error("Failed to initialize Firebase Admin:", error.message);
	console.log(
		"Please add your serviceAccountKey.json file to the backend directory"
	);
}

const db = admin.firestore();

module.exports = { admin, db };
