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
 * Analyze an image or document using GPT-4 Vision
 * @param fileUri - URI of the image or document
 * @param prompt - User's question about the image
 * @param userId - User ID
 * @returns AI analysis and usage stats
 */
export async function analyzeImage(
  fileUri: string,
  prompt: string,
  userId: string
): Promise<{ analysis: string; timestamp: string; usageRemaining: number }> {
  try {
    const formData = new FormData();
    
    // Add file
    const filename = fileUri.split('/').pop() || 'file';
    const match = /\.(\w+)$/.exec(filename);
    const type = match ? `image/${match[1]}` : 'image/jpeg';
    
    formData.append('file', {
      uri: fileUri,
      type,
      name: filename,
    } as any);
    
    formData.append('prompt', prompt);
    formData.append('userId', userId);
    
    const response = await apiService.postFormData('/api/ai/analyze-image', formData);
    
    if (response.success) {
      return {
        analysis: response.analysis,
        timestamp: response.timestamp,
        usageRemaining: response.usageRemaining,
      };
    } else {
      throw new Error(response.error || response.message || 'Failed to analyze image');
    }
  } catch (error: any) {
    console.error('AI Vision Service Error:', error);
    throw new Error(error.message || 'Failed to analyze image');
  }
}

/**
 * Get current usage stats for vision analysis
 * @param userId - User ID
 * @returns Usage statistics
 */
export async function getUsageStats(
  userId: string
): Promise<{ visionLimit: number; visionUsed: number; visionRemaining: number }> {
  try {
    const response = await apiService.get(`/api/ai/usage/${userId}`);
    
    if (response.success) {
      return {
        visionLimit: response.visionLimit,
        visionUsed: response.visionUsed,
        visionRemaining: response.visionRemaining,
      };
    } else {
      throw new Error(response.error || 'Failed to get usage stats');
    }
  } catch (error: any) {
    console.error('AI Usage Stats Error:', error);
    // Return default values on error
    return {
      visionLimit: 5,
      visionUsed: 0,
      visionRemaining: 5,
    };
  }
}

/**
 * Generate a unique ID for messages
 */
export function generateMessageId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}
