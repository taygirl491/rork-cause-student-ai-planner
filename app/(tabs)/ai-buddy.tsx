import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  TouchableWithoutFeedback,
  Keyboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Send, Bot, User as UserIcon, Sparkles, BookOpen, FileText, BrainCircuit, ArrowLeft, Paperclip, X } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import colors from '@/constants/colors';
import { useAuth } from '@/contexts/AuthContext';
import { sendMessage, generateMessageId, analyzeImage, getUsageStats } from '@/utils/aiService';
import { AIMessage } from '@/types';
import Markdown from 'react-native-markdown-display';
import { Image } from 'react-native';

const STORAGE_KEY_PREFIX = 'ai-buddy-conversation-';
const SHARED_MEMORY_KEY = 'ai-buddy-shared-memory';
const MAX_STORED_MESSAGES = 50;
const MAX_SHARED_MESSAGES = 100; // Store more in shared memory for cross-mode context

type AIMode = 'homework' | 'summarize' | 'quiz' | null;

export default function AIBuddyScreen() {
  const { user } = useAuth();
  const [mode, setMode] = useState<AIMode>(null);
  const [messages, setMessages] = useState<AIMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [selectedFile, setSelectedFile] = useState<{ uri: string; type: 'image' | 'document'; name: string } | null>(null);
  const [typingMessageId, setTypingMessageId] = useState<string | null>(null);
  const [displayedContent, setDisplayedContent] = useState<Record<string, string>>({});
  const [usageStats, setUsageStats] = useState<{ remaining: number; limit: number } | null>(null);
  const scrollViewRef = useRef<ScrollView>(null);

  // Load usage stats
  useEffect(() => {
    if (user?.uid) {
      loadUsageStats();
    }
  }, [user]);

  const loadUsageStats = async () => {
    if (!user?.uid) return;
    try {
      const stats = await getUsageStats(user.uid);
      setUsageStats({ remaining: stats.visionRemaining, limit: stats.visionLimit });
    } catch (error) {
      console.error('Error loading usage stats:', error);
    }
  };

  // Load conversation history when mode changes
  useEffect(() => {
    if (mode) {
      loadConversationHistory(mode);
    }
  }, [mode]);

  // Auto-scroll when messages change
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages]);

  const loadConversationHistory = async (currentMode: string) => {
    setIsLoadingHistory(true);
    try {
      const stored = await AsyncStorage.getItem(`${STORAGE_KEY_PREFIX}${currentMode}`);
      if (stored) {
        const parsed = JSON.parse(stored);
        setMessages(parsed);
        // Scroll to bottom after loading history
        setTimeout(() => {
          scrollViewRef.current?.scrollToEnd({ animated: false });
        }, 100);
      } else {
        setMessages([]);
      }
    } catch (error) {
      console.error('Error loading conversation:', error);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const saveConversationHistory = async (newMessages: AIMessage[], currentMode: string) => {
    try {
      // Save mode-specific conversation
      const messagesToStore = newMessages.slice(-MAX_STORED_MESSAGES);
      await AsyncStorage.setItem(`${STORAGE_KEY_PREFIX}${currentMode}`, JSON.stringify(messagesToStore));

      // Also save to shared memory with mode tags
      await saveToSharedMemory(newMessages, currentMode);
    } catch (error) {
      console.error('Error saving conversation:', error);
    }
  };

  const saveToSharedMemory = async (newMessages: AIMessage[], currentMode: string) => {
    try {
      // Load existing shared memory
      const stored = await AsyncStorage.getItem(SHARED_MEMORY_KEY);
      let sharedMemory: Array<AIMessage & { mode: AIMode }> = stored ? JSON.parse(stored) : [];

      // Add mode tags to new messages
      const taggedMessages = newMessages.map(msg => ({ ...msg, mode: currentMode as AIMode }));

      // Merge and deduplicate by message ID
      const messageMap = new Map();
      [...sharedMemory, ...taggedMessages].forEach(msg => {
        messageMap.set(msg.id, msg);
      });

      // Keep only the most recent messages
      sharedMemory = Array.from(messageMap.values())
        .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
        .slice(-MAX_SHARED_MESSAGES);

      await AsyncStorage.setItem(SHARED_MEMORY_KEY, JSON.stringify(sharedMemory));
    } catch (error) {
      console.error('Error saving to shared memory:', error);
    }
  };

  const loadSharedMemory = async (): Promise<Array<AIMessage & { mode: AIMode }>> => {
    try {
      const stored = await AsyncStorage.getItem(SHARED_MEMORY_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Error loading shared memory:', error);
      return [];
    }
  };

  const animateTyping = async (messageId: string, fullText: string) => {
    const typingSpeed = 5; // milliseconds per character
    let currentIndex = 0;

    return new Promise<void>((resolve) => {
      const interval = setInterval(() => {
        if (currentIndex <= fullText.length) {
          setDisplayedContent(prev => ({
            ...prev,
            [messageId]: fullText.substring(0, currentIndex)
          }));
          currentIndex++;

          // Auto-scroll as text appears
          setTimeout(() => {
            scrollViewRef.current?.scrollToEnd({ animated: true });
          }, 50);
        } else {
          clearInterval(interval);
          resolve();
        }
      }, typingSpeed);
    });
  };

  const handleSend = async () => {
    if (!inputText.trim() || !user?.uid || !mode) return;

    const userMessage: AIMessage = {
      id: generateMessageId(),
      role: 'user',
      content: selectedFile
        ? `[Attached ${selectedFile.type}: ${selectedFile.name}]\n\n${inputText.trim()}`
        : inputText.trim(),
      timestamp: new Date().toISOString(),
    };

    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInputText('');
    setIsLoading(true);

    try {
      // Load shared memory for cross-mode context
      const sharedMemory = await loadSharedMemory();

      // Get relevant context from other modes (last 10 messages from each mode)
      const otherModesContext = sharedMemory
        .filter(msg => msg.mode !== mode)
        .slice(-10);

      // Combine current conversation with cross-mode context
      const contextMessages = [...otherModesContext.map(({ mode: _, ...msg }) => msg), ...messages];

      // Send message to backend with mode and enhanced context
      let response;

      if (selectedFile) {
        // Send image/document analysis request
        const analysisResult = await analyzeImage(
          selectedFile.uri,
          inputText.trim() || "Analyze this",
          user.uid
        );

        response = {
          reply: analysisResult.analysis,
          timestamp: analysisResult.timestamp
        };

        // Update usage stats
        if (analysisResult.usageRemaining !== undefined) {
          setUsageStats(prev => prev ? { ...prev, remaining: analysisResult.usageRemaining } : null);
        }

        // Clear selection
        setSelectedFile(null);
      } else {
        // Regular text message
        response = await sendMessage(
          userMessage.content,
          user.uid,
          contextMessages,
          mode
        );
      }

      const assistantMessage: AIMessage = {
        id: generateMessageId(),
        role: 'assistant',
        content: response.reply,
        timestamp: response.timestamp,
      };

      const finalMessages = [...updatedMessages, assistantMessage];
      setMessages(finalMessages);

      // Start typing effect
      setTypingMessageId(assistantMessage.id);
      await animateTyping(assistantMessage.id, response.reply);
      setTypingMessageId(null);

      await saveConversationHistory(finalMessages, mode);
    } catch (error: any) {
      console.error('Error sending message:', error);

      // Check for specific error messages
      if (error.message.includes('busy') || error.message.includes('capacity') || error.message.includes('credits')) {
        Alert.alert(
          ' AI Buddy is Busy',
          'The AI service is currently experiencing high demand. Please try again in a little while.',
        );
      } else {
        Alert.alert('Error', error.message || 'Failed to get response from AI Buddy');
      }

      // Remove the user message on error
      setMessages(messages);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearConversation = () => {
    if (!mode) return;

    Alert.alert(
      'Clear Conversation',
      'Are you sure you want to clear this conversation?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            setMessages([]);
            await AsyncStorage.removeItem(`${STORAGE_KEY_PREFIX}${mode}`);
          },
        },
      ]
    );
  };

  const handlePickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: false,
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setSelectedFile({
          uri: result.assets[0].uri,
          type: 'image',
          name: result.assets[0].fileName || 'image.jpg'
        });
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const handlePickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/*'],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets[0]) {
        setSelectedFile({
          uri: result.assets[0].uri,
          type: 'document',
          name: result.assets[0].name
        });
      }
    } catch (error) {
      console.error('Error picking document:', error);
      Alert.alert('Error', 'Failed to pick document');
    }
  };

  const handleClearAttachment = () => {
    setSelectedFile(null);
  };

  const showAttachmentOptions = () => {
    Alert.alert(
      'Add Attachment',
      'Choose an option',
      [
        { text: 'Photo Library', onPress: handlePickImage },
        { text: 'Document', onPress: handlePickDocument },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const getModeTitle = (m: AIMode) => {
    switch (m) {
      case 'homework': return 'Homework Assistant';
      case 'summarize': return 'Summarize Text';
      case 'quiz': return 'Quiz Me';
      default: return 'AI Buddy';
    }
  };

  const getModeSubtitle = (m: AIMode) => {
    switch (m) {
      case 'homework': return "Help with assignments and planning";
      case 'summarize': return "Get quick summaries of topics";
      case 'quiz': return "Test your knowledge";
      default: return "";
    }
  };

  const renderMessage = (message: AIMessage) => {
    const isUser = message.role === 'user';
    const isTyping = message.id === typingMessageId;
    const content = isTyping ? (displayedContent[message.id] || '') : message.content;

    const markdownStyles = {
      body: {
        color: isUser ? colors.surface : colors.text,
        fontSize: 15,
        lineHeight: 20
      },
      paragraph: {
        marginTop: 0,
        marginBottom: 8,
        flexWrap: 'wrap' as const,
      },
      strong: {
        fontWeight: 'bold' as const,
        color: isUser ? colors.surface : colors.text,
      },
      link: {
        color: isUser ? colors.surface : colors.primary,
      },
      list_item: {
        marginVertical: 2,
      },
      bullet_list: {
        marginVertical: 4,
      },
      ordered_list: {
        marginVertical: 4,
      },
      code_inline: {
        backgroundColor: isUser ? 'rgba(255,255,255,0.2)' : colors.surface,
        paddingHorizontal: 4,
        paddingVertical: 2,
        borderRadius: 4,
        fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
      },
      code_block: {
        backgroundColor: isUser ? 'rgba(255,255,255,0.2)' : colors.surface,
        padding: 12,
        borderRadius: 8,
        marginVertical: 8,
        fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
      },
    };

    return (
      <View key={message.id} style={[styles.messageContainer, isUser && styles.userMessageContainer]}>
        <View style={[styles.messageAvatar, isUser ? styles.userAvatar : styles.aiAvatar]}>
          {isUser ? (
            <UserIcon size={16} color={colors.surface} />
          ) : (
            <Bot size={16} color={colors.surface} />
          )}
        </View>
        <View style={[styles.messageBubble, isUser ? styles.userBubble : styles.aiBubble]}>
          <Markdown style={markdownStyles}>
            {content}
          </Markdown>
          {isTyping && <Text style={styles.typingCursor}>▋</Text>}
          <Text style={styles.messageTime}>
            {new Date(message.timestamp).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </Text>
        </View>
      </View>
    );
  };

  const renderDashboard = () => (
    <ScrollView style={styles.dashboardContainer} contentContainerStyle={styles.dashboardContent}>
      <View style={styles.dashboardHeader}>
        <Text style={styles.dashboardTitle}>How can I help you?</Text>
        <Text style={styles.dashboardSubtitle}>Choose a mode to get started</Text>
      </View>

      <TouchableOpacity style={styles.card} onPress={() => setMode('homework')}>
        <View style={[styles.cardIcon, { backgroundColor: colors.primaryLight + '30' }]}>
          <BookOpen size={32} color={colors.primary} />
        </View>
        <View style={styles.cardTextContainer}>
          <Text style={styles.cardTitle}>Homework Assistant</Text>
          <Text style={styles.cardDescription}>Get help with your assignments and study planning.</Text>
        </View>
      </TouchableOpacity>

      <TouchableOpacity style={styles.card} onPress={() => setMode('summarize')}>
        <View style={[styles.cardIcon, { backgroundColor: '#10b98130' }]}>
          <FileText size={32} color="#10b981" />
        </View>
        <View style={styles.cardTextContainer}>
          <Text style={styles.cardTitle}>Summarize Text</Text>
          <Text style={styles.cardDescription}>Get concise summaries of any topic or text.</Text>
        </View>
      </TouchableOpacity>

      <TouchableOpacity style={styles.card} onPress={() => setMode('quiz')}>
        <View style={[styles.cardIcon, { backgroundColor: '#f59e0b30' }]}>
          <BrainCircuit size={32} color="#f59e0b" />
        </View>
        <View style={styles.cardTextContainer}>
          <Text style={styles.cardTitle}>Quiz Me</Text>
          <Text style={styles.cardDescription}>Test your knowledge on your current classes and tasks.</Text>
        </View>
      </TouchableOpacity>
    </ScrollView>
  );

  const renderChat = () => (
    <KeyboardAvoidingView
      style={styles.chatContainer}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 100}
    >
      <View style={styles.chatHeader}>
        <TouchableOpacity onPress={() => setMode(null)} style={styles.backButton}>
          <ArrowLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.chatHeaderText}>
          <Text style={styles.chatTitle}>{getModeTitle(mode)}</Text>
          <Text style={styles.chatSubtitle}>{getModeSubtitle(mode)}</Text>
          {usageStats && (
            <Text style={styles.usageText}>
              Vision Analysis: {usageStats.remaining}/{usageStats.limit} left today
            </Text>
          )}
        </View>
        <TouchableOpacity onPress={handleClearConversation} style={styles.clearButton}>
          <X size={20} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      {isLoadingHistory ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading conversation...</Text>
        </View>
      ) : (
        <>
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <ScrollView
              ref={scrollViewRef}
              style={styles.messagesContainer}
              contentContainerStyle={styles.messagesContent}
              onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
              keyboardShouldPersistTaps="handled"
            >
              {messages.length === 0 ? (
                <View style={styles.emptyState}>
                  <Sparkles size={48} color={colors.primary} />
                  <Text style={styles.emptyStateText}>Start a conversation!</Text>
                  <Text style={styles.emptyStateSubtext}>
                    Ask me anything about {getModeTitle(mode)?.toLowerCase()}
                  </Text>
                </View>
              ) : (
                messages.map(renderMessage)
              )}
              {isLoading && (
                <View style={styles.loadingMessage}>
                  <View style={[styles.messageAvatar, styles.aiAvatar]}>
                    <Bot size={16} color={colors.surface} />
                  </View>
                  <View style={[styles.messageBubble, styles.aiBubble]}>
                    <ActivityIndicator size="small" color={colors.primary} />
                    <Text style={styles.loadingMessageText}>Thinking...</Text>
                  </View>
                </View>
              )}
            </ScrollView>
          </TouchableWithoutFeedback>

          <View style={styles.inputContainer}>
            {mode && (
              <View>
                {selectedFile ? (
                  <View style={styles.previewContainer}>
                    {selectedFile.type === 'image' ? (
                      <Image source={{ uri: selectedFile.uri }} style={styles.previewImage} />
                    ) : (
                      <View style={styles.previewDoc}>
                        <FileText size={24} color={colors.primary} />
                      </View>
                    )}
                    <TouchableOpacity
                      style={styles.removePreviewButton}
                      onPress={handleClearAttachment}
                    >
                      <X size={12} color="white" />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={styles.attachmentButton}
                    onPress={showAttachmentOptions}
                    disabled={isLoading}
                  >
                    <Paperclip size={20} color={isLoading ? colors.textLight : colors.text} />
                  </TouchableOpacity>
                )}
              </View>
            )}
            <TextInput
              style={styles.input}
              placeholder="Type your message..."
              placeholderTextColor={colors.textLight}
              value={inputText}
              onChangeText={setInputText}
              multiline
              maxLength={1000}
              editable={!isLoading}
            />
            <TouchableOpacity
              style={[styles.sendButton, (!inputText.trim() || isLoading) && styles.sendButtonDisabled]}
              onPress={handleSend}
              disabled={!inputText.trim() || isLoading}
            >
              <Send size={20} color={colors.surface} />
            </TouchableOpacity>
          </View>
        </>
      )}
    </KeyboardAvoidingView>
  );

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      {mode ? renderChat() : renderDashboard()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  dashboardContainer: {
    flex: 1,
  },
  dashboardContent: {
    padding: 20,
  },
  dashboardHeader: {
    marginBottom: 32,
    alignItems: 'center',
  },
  dashboardTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
  },
  dashboardSubtitle: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  card: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  cardIcon: {
    width: 60,
    height: 60,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  cardTextContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  cardDescription: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  chatContainer: {
    flex: 1,
  },
  chatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    marginRight: 12,
  },
  chatHeaderText: {
    flex: 1,
  },
  chatTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  chatSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  clearButton: {
    padding: 8,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: colors.textSecondary,
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    padding: 16,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyStateText: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text,
    marginTop: 16,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 8,
    textAlign: 'center',
  },
  messageContainer: {
    flexDirection: 'row',
    marginBottom: 16,
    alignItems: 'flex-start',
  },
  userMessageContainer: {
    flexDirection: 'row-reverse',
  },
  messageAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 8,
  },
  userAvatar: {
    backgroundColor: colors.primary,
  },
  aiAvatar: {
    backgroundColor: colors.secondary,
  },
  messageBubble: {
    maxWidth: '75%',
    padding: 12,
    borderRadius: 16,
  },
  userBubble: {
    backgroundColor: colors.primary,
    borderBottomRightRadius: 4,
  },
  aiBubble: {
    backgroundColor: colors.surface,
    borderBottomLeftRadius: 4,
  },
  messageTime: {
    fontSize: 10,
    color: colors.textLight,
    marginTop: 4,
    textAlign: 'right',
  },
  typingCursor: {
    fontSize: 15,
    color: colors.primary,
    marginLeft: 2,
  },
  loadingMessage: {
    flexDirection: 'row',
    marginBottom: 16,
    alignItems: 'flex-start',
  },
  loadingMessageText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginLeft: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    alignItems: 'flex-end',
  },
  attachmentButton: {
    padding: 12,
    marginRight: 8,
  },
  input: {
    flex: 1,
    backgroundColor: colors.background,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    color: colors.text,
    maxHeight: 100,
  },
  sendButton: {
    backgroundColor: colors.primary,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  usageText: {
    fontSize: 11,
    color: colors.primary,
    marginTop: 2,
    fontWeight: '600',
  },
  previewContainer: {
    marginRight: 8,
    position: 'relative',
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewImage: {
    width: 40,
    height: 40,
    borderRadius: 8,
  },
  previewDoc: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  removePreviewButton: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: colors.error,
    borderRadius: 10,
    width: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'white',
  },
});
