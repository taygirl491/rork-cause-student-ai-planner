const { OpenAI } = require("openai");

// Initialize OpenAI client
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Build a system prompt with user context and mode
 * @param {Object} userContext - User's tasks, classes, and goals
 * @param {string} mode - 'homework', 'summarize', or 'quiz'
 * @returns {string} System prompt
 */
function buildSystemPrompt(userContext, mode = 'homework') {
    const { tasks = [], classes = [], goals = [], currentTime } = userContext;

    let roleDescription = "";
    switch (mode) {
        case 'summarize':
            roleDescription = "You are an expert summarizer. Your goal is to provide concise, clear, and accurate summaries of any text or topics the student provides. Use bullet points for key concepts. Focus on main ideas and important details. Keep summaries structured and easy to scan.";
            break;
        case 'quiz':
            roleDescription = "You are a quiz master and educational assistant. When given text or a topic, generate quiz questions to test the student's understanding. Create a mix of question types (multiple choice, true/false, short answer). Ask ONE question at a time, wait for the student's answer, then provide feedback and explanation before moving to the next question. Be encouraging and educational in your feedback.";
            break;
        case 'homework':
        default:
            roleDescription = "You are a helpful homework assistant and study buddy. Help students with their assignments, explain concepts, solve problems step-by-step, and answer academic questions. Be patient, encouraging, and provide clear explanations. You can help with any subject or topic.";
            break;
    }

    // Add cross-mode awareness instructions
    const crossModeInstructions = "\n\nIMPORTANT: You have access to the student's conversation history across all AI Buddy modes (Homework Assistant, Summarize, and Quiz Me). If the student references a previous discussion, assignment, or topic from another mode, you can use that context to provide better assistance. For example:\n- If asked to create a quiz about a homework topic, reference the homework discussion\n- If asked to summarize a previous conversation, use the relevant chat history\n- Connect concepts across different modes to provide comprehensive help";

    let prompt = `${roleDescription}${crossModeInstructions}\n\nHere is their current context:\n\n`;

    // Add upcoming tasks
    if (tasks.length > 0) {
        prompt += `UPCOMING TASKS:\n`;
        tasks.forEach((task) => {
            const priority = task.priority ? ` (Priority: ${task.priority})` : "";
            const dueDate = task.dueDate ? ` - Due: ${task.dueDate}` : "";
            prompt += `- ${task.description}${dueDate}${priority}\n`;
        });
        prompt += `\n`;
    } else {
        prompt += `UPCOMING TASKS: None\n\n`;
    }

    // Add today's classes
    if (classes.length > 0) {
        prompt += `TODAY'S CLASSES:\n`;
        classes.forEach((cls) => {
            prompt += `- ${cls.name} at ${cls.time}\n`;
        });
        prompt += `\n`;
    } else {
        prompt += `TODAY'S CLASSES: None\n\n`;
    }

    // Add active goals
    if (goals.length > 0) {
        prompt += `GOALS:\n`;
        goals.forEach((goal) => {
            prompt += `- ${goal.title}\n`;
        });
        prompt += `\n`;
    }

    // Add current time
    if (currentTime) {
        prompt += `Current time: ${currentTime}\n\n`;
    }

    prompt += `Be encouraging and supportive. Keep responses concise and actionable.`;

    return prompt;
}

/**
 * Generate a chat response using OpenAI
 * @param {Array} messages - Array of message objects with role and content
 * @param {Object} userContext - User's tasks, classes, and goals
 * @param {string} mode - Chat mode
 * @returns {Promise<string>} AI response
 */
async function generateChatResponse(messages, userContext = {}, mode = 'homework') {
    try {
        // Build system prompt with context and mode
        const systemPrompt = buildSystemPrompt(userContext, mode);

        // Prepare messages for OpenAI
        const openaiMessages = [
            { role: "system", content: systemPrompt },
            ...messages,
        ];

        // Call OpenAI API
        const completion = await openai.chat.completions.create({
            model: "gpt-4o-mini", // Using cost-effective model
            messages: openaiMessages,
            temperature: 0.7,
            max_tokens: 500, // Keep responses concise
        });

        return completion.choices[0].message.content;
    } catch (error) {
        console.error("OpenAI API Error:", error);

        // Handle specific error types
        if (error.status === 401) {
            throw new Error("Invalid OpenAI API key");
        } else if (error.status === 429) {
            throw new Error("OpenAI rate limit exceeded. Please try again later.");
        } else if (error.status === 500) {
            throw new Error("OpenAI service error. Please try again later.");
        }

        throw new Error(`Failed to generate response: ${error.message}`);
    }
}

/**
 * Analyze an image using GPT-4 Vision
 * @param {string} imageBase64 - Base64 encoded image
 * @param {string} prompt - User's question about the image
 * @param {Object} userContext - User's tasks, classes, and goals
 * @returns {Promise<string>} AI analysis
 */
async function analyzeImage(imageBase64, prompt, userContext = {}) {
    try {
        const systemPrompt = buildSystemPrompt(userContext, 'homework');

        const completion = await openai.chat.completions.create({
            model: "gpt-4o", // Has vision built-in
            messages: [
                { role: "system", content: systemPrompt },
                {
                    role: "user",
                    content: [
                        {
                            type: "text",
                            text: prompt || "Analyze this image and help me understand it. If it's a homework problem, solve it step-by-step. If it's notes or a diagram, explain the key concepts."
                        },
                        {
                            type: "image_url",
                            image_url: {
                                url: `data:image/jpeg;base64,${imageBase64}`,
                                detail: "high" // High detail for better text recognition
                            }
                        }
                    ]
                }
            ],
            max_tokens: 1500, // More tokens for detailed analysis
            temperature: 0.7,
        });

        return completion.choices[0].message.content;
    } catch (error) {
        console.error("OpenAI Vision API Error:", error);

        // Handle specific error types
        if (error.status === 401) {
            throw new Error("Invalid OpenAI API key");
        } else if (error.status === 429 || error.code === 'insufficient_quota') {
            throw new Error("The AI service is currently busy or out of credits. Please try again later.");
        } else if (error.status === 400 && error.message.includes('image')) {
            throw new Error("Invalid image format. Please upload a clear image.");
        }

        throw new Error(`Failed to analyze image: ${error.message}`);
    }
}

/**
 * Parse a syllabus document using GPT-4 Vision/Text
 * @param {string} fileBase64 - Base64 encoded file content
 * @param {string} mimeType - File mime type
 * @returns {Promise<Object>} Structured syllabus data
 */
async function parseSyllabus(fileBase64, mimeType = 'application/pdf') {
    try {
        const systemPrompt = `You are a helpful assistant that extracts course schedules from syllabus documents. 
        CRITICAL: You MUST find all assignments, exams, quizzes, and readings.
        
        Return a valid JSON object:
        {
            "courseInfo": { "code": "e.g. CS101", "name": "Course Name", "professor": "Name" },
            "assignments": [ { "title": "...", "dueDate": "YYYY-MM-DD", "description": "..." } ],
            "exams": [ { "title": "...", "date": "YYYY-MM-DD", "description": "..." } ]
        }
        
        Strategies:
        1. **Everything is a task**: If it has a date and a name, it is an assignment. 
        2. **Weekly Items**: If the syllabus lists "Week 1: Output Devices", create an assignment "Week 1 - Output Devices" due on the Friday of that week (estimate dates if needed).
        3. **Readings**: Even "Read Chapter 1" is an assignment.
        4. **Tables**: Iterate through every row of any schedule table.
        
        Rules:
        - If 'dueDate' is missing, Use the current date "${new Date().toISOString().split('T')[0]}" as a fallback. DO NOT USE NULL.
        - **If you are unsure if something is an assignment, INCLUDE IT ANYWAY.**
        - Default to "assignments" for everything that isn't explicitly an "exam" or "test".
        `;

        let userMessageContent;

        if (mimeType === 'application/pdf') {
            try {
                const pdfParse = require('pdf-parse');
                const buffer = Buffer.from(fileBase64, 'base64');
                const pdfData = await pdfParse(buffer);
                const text = pdfData.text;

                // Truncate text if too long (approx 100k chars limit to be safe with tokens)
                const truncatedText = text.substring(0, 50000);

                userMessageContent = [
                    { type: "text", text: "Parse this syllabus text extracted from a PDF:" },
                    { type: "text", text: truncatedText }
                ];
            } catch (pdfError) {
                console.error("PDF Parsing failed, trying fallback or erroring:", pdfError);
                throw new Error("Failed to extract text from PDF. It might be a scanned image. Please upload a clear image instead.");
            }
        } else {
            // Image handling
            userMessageContent = [
                { type: "text", text: "Parse this syllabus." },
                {
                    type: "image_url",
                    image_url: {
                        url: `data:${mimeType};base64,${fileBase64}`,
                        detail: "high"
                    }
                }
            ];
        }

        const completion = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
                { role: "system", content: systemPrompt },
                {
                    role: "user",
                    content: userMessageContent
                }
            ],
            temperature: 0.1,
            response_format: { type: "json_object" }
        });

        return JSON.parse(completion.choices[0].message.content);
    } catch (error) {
        console.error("Syllabus Parsing Error:", error);
        throw new Error(`Failed to parse syllabus: ${error.message}`);
    }
}

module.exports = {
    generateChatResponse,
    buildSystemPrompt,
    analyzeImage,
    parseSyllabus,
};
