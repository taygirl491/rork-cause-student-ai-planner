import apiService from './apiService';

export interface AIMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
}

/**
 * Send a message to the AI Buddy
 * @param message - User's message
 * @param userId - User ID for context
 * @param conversationHistory - Previous messages in the conversation
 * @returns AI response
 */
export async function sendMessage(
  message: string,
  userId: string,
  conversationHistory: AIMessage[] = [],
  mode: 'homework' | 'summarize' | 'quiz' = 'homework'
): Promise<{ reply: string; timestamp: string }> {
  try {
    // Format conversation history for API (only role and content)
    const formattedHistory = conversationHistory.map(msg => ({
      role: msg.role,
      content: msg.content,
    }));

    const response = await apiService.post('/api/ai/chat', {
      message,
      userId,
      conversationHistory: formattedHistory,
      mode,
    });

    if (response.success) {
      return {
        reply: response.reply,
        timestamp: response.timestamp,
      };
    } else {
      throw new Error(response.error || 'Failed to get AI response');
    }
  } catch (error: any) {
    console.error('AI Service Error:', error);
    throw new Error(error.message || 'Failed to communicate with AI Buddy');
  }
}

/**
 * Generate a unique ID for messages
 */
export function generateMessageId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}
