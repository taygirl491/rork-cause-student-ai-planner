const express = require("express");
const router = express.Router();
const { db } = require("./firebase");
const { generateChatResponse, analyzeImage } = require("./openaiService");
const multer = require('multer');

// Configure multer for memory storage
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB limit
    },
    fileFilter: (req, file, cb) => {
        // Accept images and PDFs
        if (file.mimetype.startsWith('image/') || file.mimetype === 'application/pdf') {
            cb(null, true);
        } else {
            cb(new Error('Only images and PDF documents are allowed'));
        }
    }
});

// Daily usage limits for free users
const DAILY_VISION_LIMIT = 5;

/**
 * POST /api/ai/analyze-image
 * Analyze an image or document using GPT-4 Vision
 */
router.post("/analyze-image", upload.single('file'), async (req, res) => {
    try {
        const { prompt, userId } = req.body;

        if (!req.file) {
            return res.status(400).json({
                error: "No file uploaded",
            });
        }

        if (!userId) {
            return res.status(400).json({
                error: "Missing required field: userId",
            });
        }

        // Check daily usage limit
        const today = new Date().toISOString().split('T')[0];
        const usageKey = `vision_usage_${userId}_${today}`;

        const usageDoc = await db.collection('ai_usage').doc(usageKey).get();
        const currentUsage = usageDoc.exists ? usageDoc.data().count : 0;

        if (currentUsage >= DAILY_VISION_LIMIT) {
            return res.status(429).json({
                error: "Daily vision analysis limit reached",
                message: `You've reached your daily limit of ${DAILY_VISION_LIMIT} image analyses. Try again tomorrow!`,
                limit: DAILY_VISION_LIMIT,
                used: currentUsage,
            });
        }

        // Convert image to base64
        const imageBase64 = req.file.buffer.toString('base64');

        // Fetch user context
        const userContext = await fetchUserContext(userId);

        // Analyze image
        const analysis = await analyzeImage(imageBase64, prompt, userContext);

        // Update usage count
        await db.collection('ai_usage').doc(usageKey).set({
            userId,
            date: today,
            count: currentUsage + 1,
            lastUsed: new Date().toISOString(),
        }, { merge: true }); // Use merge to update existing document without overwriting other fields

        res.json({
            success: true,
            analysis,
            timestamp: new Date().toISOString(),
            usageRemaining: DAILY_VISION_LIMIT - (currentUsage + 1),
        });
    } catch (error) {
        console.error("Error in image analysis:", error);

        // Check for specific billing/quota error
        if (error.message.includes("out of credits") || error.message.includes("quota")) {
            return res.status(429).json({
                error: "The AI service is currently busy (out of credits). Please try again later.",
                details: error.message
            });
        }

        res.status(500).json({
            error: "Failed to analyze image",
            details: error.message,
        });
    }
});

/**
 * GET /api/ai/usage
 * Get current usage stats for the user
 */
router.get("/usage/:userId", async (req, res) => {
    try {
        const { userId } = req.params;
        const today = new Date().toISOString().split('T')[0];
        const usageKey = `vision_usage_${userId}_${today}`;

        const usageDoc = await db.collection('ai_usage').doc(usageKey).get();
        const currentUsage = usageDoc.exists ? usageDoc.data().count : 0;

        res.json({
            success: true,
            visionLimit: DAILY_VISION_LIMIT,
            visionUsed: currentUsage,
            visionRemaining: DAILY_VISION_LIMIT - currentUsage,
        });
    } catch (error) {
        console.error("Error fetching usage:", error);
        res.status(500).json({
            error: "Failed to fetch usage",
            details: error.message,
        });
    }
});

/**
 * POST /api/ai/chat
 * Main chat endpoint for AI Buddy
 * Accepts user message and conversation history
 * Returns AI response with user context
 */
router.post("/chat", async (req, res) => {
    try {
        const { message, conversationHistory = [], userId, mode = "homework" } = req.body;

        if (!message || !message.trim()) {
            return res.status(400).json({
                error: "Missing required field: message",
            });
        }

        if (!userId) {
            return res.status(400).json({
                error: "Missing required field: userId",
            });
        }

        // Fetch user context from Firestore
        const userContext = await fetchUserContext(userId);

        // Prepare messages for OpenAI (limit to last 10 for context window)
        const recentHistory = conversationHistory.slice(-10);
        const messages = [
            ...recentHistory,
            { role: "user", content: message },
        ];

        // Generate AI response
        const aiResponse = await generateChatResponse(messages, userContext, mode);

        res.json({
            success: true,
            reply: aiResponse,
            timestamp: new Date().toISOString(),
        });
    } catch (error) {
        console.error("Error in AI chat:", error);
        res.status(500).json({
            error: "Failed to generate response",
            details: error.message,
        });
    }
});

/**
 * Fetch user context from Firestore
 * @param {string} userId - User ID
 * @returns {Promise<Object>} User context with tasks, classes, and goals
 */
async function fetchUserContext(userId) {
    try {
        const now = new Date();
        const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
        const today = now.toISOString().split("T")[0];

        // Fetch upcoming tasks (next 7 days, not completed)
        const tasksSnapshot = await db
            .collection("tasks")
            .where("userId", "==", userId)
            .where("completed", "==", false)
            .orderBy("dueDate")
            .limit(10)
            .get();

        const tasks = [];
        tasksSnapshot.forEach((doc) => {
            const data = doc.data();
            const dueDate = new Date(data.dueDate);
            if (dueDate <= sevenDaysFromNow) {
                tasks.push({
                    description: data.description,
                    dueDate: data.dueDate,
                    priority: data.priority,
                    type: data.type,
                });
            }
        });

        // Fetch today's classes
        const classesSnapshot = await db
            .collection("classes")
            .where("userId", "==", userId)
            .get();

        const classes = [];
        const dayOfWeek = now.toLocaleDateString("en-US", { weekday: "long" });

        classesSnapshot.forEach((doc) => {
            const data = doc.data();
            if (data.daysOfWeek && data.daysOfWeek.includes(dayOfWeek)) {
                classes.push({
                    name: data.name,
                    time: data.time,
                    professor: data.professor,
                });
            }
        });

        // Fetch active goals
        const goalsSnapshot = await db
            .collection("goals")
            .where("userId", "==", userId)
            .where("completed", "==", false)
            .limit(5)
            .get();

        const goals = [];
        goalsSnapshot.forEach((doc) => {
            const data = doc.data();
            goals.push({
                title: data.title,
                description: data.description,
            });
        });

        return {
            tasks,
            classes,
            goals,
            currentTime: now.toLocaleString("en-US", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
            }),
        };
    } catch (error) {
        console.error("Error fetching user context:", error);
        // Return empty context on error
        return {
            tasks: [],
            classes: [],
            goals: [],
            currentTime: new Date().toLocaleString(),
        };
    }
}

module.exports = router;
