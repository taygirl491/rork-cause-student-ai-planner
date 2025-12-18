# AI Buddy Cross-Mode Memory System

## Overview
The AI Buddy now features a **shared memory system** that enables all three modes (Homework Assistant, Summarize, and Quiz Me) to access each other's conversation history. This creates a more intelligent and context-aware AI assistant.

## How It Works

### 1. **Shared Memory Storage**
- All conversations are stored in two places:
  - **Mode-specific storage**: `ai-buddy-conversation-{mode}` (for quick mode switching)
  - **Shared memory**: `ai-buddy-shared-memory` (for cross-mode context)
- Each message in shared memory is tagged with its mode
- Stores up to 100 messages across all modes

### 2. **Cross-Mode Context Loading**
When you send a message:
1. The app loads the shared memory
2. Extracts the last 10 messages from OTHER modes
3. Combines them with your current conversation
4. Sends everything to the AI for context-aware responses

### 3. **AI Intelligence**
The AI system prompt now includes:
```
IMPORTANT: You have access to the student's conversation history across all AI Buddy modes 
(Homework Assistant, Summarize, and Quiz Me). If the student references a previous discussion, 
assignment, or topic from another mode, you can use that context to provide better assistance.
```

## Example Use Cases

### 1. **Quiz Based on Homework**
**Homework Assistant:**
> User: "Can you help me understand photosynthesis?"
> AI: "Sure! Photosynthesis is the process where plants convert light energy into chemical energy..."

**Quiz Me:**
> User: "Create a quiz about the last topic we discussed"
> AI: "Great! Let's test your knowledge on photosynthesis. Question 1: What is the primary source of energy for photosynthesis?"

### 2. **Summarize Previous Discussion**
**Homework Assistant:**
> User: "Explain Newton's three laws of motion"
> AI: [Detailed explanation]

**Summarize:**
> User: "Summarize what we discussed about Newton's laws"
> AI: [Concise bullet-point summary of the previous conversation]

### 3. **Continue Across Modes**
**Quiz Me:**
> User: "Quiz me on algebra"
> AI: [Generates algebra questions]

**Homework Assistant:**
> User: "I need help with the algebra problem from the quiz"
> AI: [References the quiz question and provides step-by-step help]

## New Features Added

### ✅ Attachment Support for All Modes
- Previously: Only Homework Assistant had attachment button
- Now: All modes (Homework, Summarize, Quiz Me) support image and file uploads
- Users can upload documents to summarize or images to quiz on

### ✅ Auto-Scroll to Latest Message
- Messages automatically scroll to the bottom when:
  - Page first opens
  - New messages arrive
  - Content size changes
- Works just like WhatsApp!

## Technical Implementation

### Frontend (`ai-buddy.tsx`)
```typescript
// Shared memory functions
const saveToSharedMemory = async (messages, mode) => {
  // Tags messages with mode and stores in shared memory
}

const loadSharedMemory = async () => {
  // Loads all cross-mode conversations
}

// Enhanced message sending
const handleSend = async () => {
  // 1. Load shared memory
  const sharedMemory = await loadSharedMemory();
  
  // 2. Get context from other modes
  const otherModesContext = sharedMemory
    .filter(msg => msg.mode !== currentMode)
    .slice(-10);
  
  // 3. Combine with current conversation
  const contextMessages = [...otherModesContext, ...messages];
  
  // 4. Send to AI with full context
  await sendMessage(userMessage, userId, contextMessages, mode);
}
```

### Backend (`openaiService.js`)
```javascript
// Enhanced system prompt
const crossModeInstructions = `
IMPORTANT: You have access to conversation history across all modes.
Use this context to provide better assistance when students reference
previous discussions from other modes.
`;
```

## Benefits

1. **Seamless Learning Experience**: Students don't need to repeat information
2. **Intelligent Context**: AI understands the full learning journey
3. **Natural Conversations**: Reference any previous discussion naturally
4. **Better Study Flow**: Move between modes without losing context
5. **Enhanced Productivity**: Less time explaining, more time learning

## Storage Limits

- **Mode-specific**: 50 messages per mode
- **Shared memory**: 100 messages total across all modes
- Messages are automatically pruned to stay within limits
- Most recent messages are always kept

## Privacy & Data

- All conversations stored locally on device (AsyncStorage)
- No server-side conversation storage
- User can clear conversations anytime
- Each mode can be cleared independently

## Future Enhancements

Potential improvements:
- [ ] Smart context selection (only send most relevant messages)
- [ ] Conversation search across modes
- [ ] Export conversation history
- [ ] Conversation analytics (topics discussed, time spent, etc.)
- [ ] Voice input/output support
- [ ] Actual image/document analysis (when backend supports it)
