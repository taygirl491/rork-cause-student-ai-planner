const express = require("express");
const router = express.Router();
const { db } = require("./firebase");
const { generateChatResponse } = require("./openaiService");

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
