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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Send, Bot, User as UserIcon, Sparkles, BookOpen, FileText, BrainCircuit, ArrowLeft, Paperclip, X } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import colors from '@/constants/colors';
import { useAuth } from '@/contexts/AuthContext';
import { sendMessage, generateMessageId } from '@/utils/aiService';
import { AIMessage } from '@/types';
import Markdown from 'react-native-markdown-display';

const STORAGE_KEY_PREFIX = 'ai-buddy-conversation-';
const MAX_STORED_MESSAGES = 50;

type AIMode = 'homework' | 'summarize' | 'quiz' | null;

export default function AIBuddyScreen() {
  const { user } = useAuth();
  const [mode, setMode] = useState<AIMode>(null);
  const [messages, setMessages] = useState<AIMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const scrollViewRef = useRef<ScrollView>(null);

  // Load conversation history when mode changes
  useEffect(() => {
    if (mode) {
      loadConversationHistory(mode);
    }
  }, [mode]);

  // Auto-scroll to bottom when new messages arrive
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
      // Keep only the most recent messages
      const messagesToStore = newMessages.slice(-MAX_STORED_MESSAGES);
      await AsyncStorage.setItem(`${STORAGE_KEY_PREFIX}${currentMode}`, JSON.stringify(messagesToStore));
    } catch (error) {
      console.error('Error saving conversation:', error);
    }
  };

  const handleSend = async () => {
    if (!inputText.trim() || !user?.uid || !mode) return;

    const userMessage: AIMessage = {
      id: generateMessageId(),
      role: 'user',
      content: inputText.trim(),
      timestamp: new Date().toISOString(),
    };

    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInputText('');
    setIsLoading(true);

    try {
      // Send message to backend with mode
      const response = await sendMessage(
        userMessage.content,
        user.uid,
        messages,
        mode
      );

      const assistantMessage: AIMessage = {
        id: generateMessageId(),
        role: 'assistant',
        content: response.reply,
        timestamp: response.timestamp,
      };

      const finalMessages = [...updatedMessages, assistantMessage];
      setMessages(finalMessages);
      await saveConversationHistory(finalMessages, mode);
    } catch (error: any) {
      console.error('Error sending message:', error);
      Alert.alert('Error', error.message || 'Failed to get response from AI Buddy');

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
        Alert.alert('Coming Soon', 'Image analysis will be available in a future update!');
        // TODO: Implement image upload to backend when GPT-4 Vision is ready
        // setSelectedImages([...selectedImages, result.assets[0].uri]);
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
        Alert.alert('Coming Soon', 'Document analysis will be available in a future update!');
        // TODO: Implement document upload when ready
      }
    } catch (error) {
      console.error('Error picking document:', error);
      Alert.alert('Error', 'Failed to pick document');
    }
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

  const renderMessage = (message: AIMessage) => {
    const isUser = message.role === 'user';

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
        marginBottom: 8,
      },
    };

    return (
      <View
        key={message.id}
        style={[
          styles.messageContainer,
          isUser ? styles.userMessageContainer : styles.aiMessageContainer,
        ]}
      >
        <View style={[styles.messageAvatar, isUser ? styles.userAvatar : styles.aiAvatar]}>
          {isUser ? (
            <UserIcon size={16} color={colors.surface} />
          ) : (
            <Bot size={16} color={colors.surface} />
          )}
        </View>
        <View style={[styles.messageBubble, isUser ? styles.userBubble : styles.aiBubble]}>
          <Markdown style={markdownStyles}>
            {message.content}
          </Markdown>
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
  }

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
          <Text style={styles.cardDescription}>Get help with your assignments, study planning, and scheduling.</Text>
        </View>
      </TouchableOpacity>

      <TouchableOpacity style={styles.card} onPress={() => setMode('summarize')}>
        <View style={[styles.cardIcon, { backgroundColor: '#10b98130' }]}>
          <FileText size={32} color="#10b981" />
        </View>
        <View style={styles.cardTextContainer}>
          <Text style={styles.cardTitle}>Summarize</Text>
          <Text style={styles.cardDescription}>Paste text or ask about a topic to get a concise summary.</Text>
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

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          {mode ? (
            <TouchableOpacity onPress={() => setMode(null)} style={styles.backButton}>
              <ArrowLeft size={24} color={colors.text} />
            </TouchableOpacity>
          ) : (
            <View style={styles.headerIcon}>
              <Sparkles size={24} color={colors.primary} />
            </View>
          )}
          <View>
            <Text style={styles.title}>{mode ? getModeTitle(mode) : 'AI Buddy'}</Text>
            <Text style={styles.subtitle}>{mode ? getModeSubtitle(mode) : 'Your study assistant'}</Text>
          </View>
        </View>
        {mode && messages.length > 0 && (
          <TouchableOpacity onPress={handleClearConversation} style={styles.clearButton}>
            <Text style={styles.clearButtonText}>Clear</Text>
          </TouchableOpacity>
        )}
      </View>

      {!mode ? (
        renderDashboard()
      ) : (
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardAvoid}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
        >
          {isLoadingHistory ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={styles.loadingText}>Loading conversation...</Text>
            </View>
          ) : (
            <>
              <ScrollView
                ref={scrollViewRef}
                style={styles.messagesContainer}
                contentContainerStyle={styles.messagesContent}
                showsVerticalScrollIndicator={false}
              >
                {messages.length === 0 ? (
                  <View style={styles.emptyState}>
                    <Bot size={64} color={colors.textLight} />
                    <Text style={styles.emptyTitle}>Hi! I'm ready to help.</Text>
                    <Text style={styles.emptySubtitle}>
                      Ask me anything related to {getModeTitle(mode).toLowerCase()}.
                    </Text>
                  </View>
                ) : (
                  messages.map(renderMessage)
                )}
                {isLoading && (
                  <View style={styles.loadingMessage}>
                    <ActivityIndicator size="small" color={colors.primary} />
                    <Text style={styles.loadingMessageText}>Thinking...</Text>
                  </View>
                )}
              </ScrollView>

              <View style={styles.inputContainer}>
                {mode === 'homework' && (
                  <TouchableOpacity
                    style={styles.attachmentButton}
                    onPress={showAttachmentOptions}
                    disabled={isLoading}
                  >
                    <Paperclip size={20} color={isLoading ? colors.textLight : colors.text} />
                  </TouchableOpacity>
                )}
                <TextInput
                  style={styles.input}
                  placeholder={`Ask ${getModeTitle(mode)}...`}
                  placeholderTextColor={colors.textLight}
                  value={inputText}
                  onChangeText={setInputText}
                  multiline
                  maxLength={500}
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
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    // marginTop: 12,
    fontSize: 14,
    color: colors.textSecondary,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
    zIndex: 10,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backButton: {
    padding: 4,
  },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primaryLight + '30',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: colors.text,
  },
  subtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  clearButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: colors.error + '20',
  },
  clearButtonText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: colors.error || '#ef4444',
  },
  keyboardAvoid: {
    flex: 1,
  },
  // Dashboard Styles
  dashboardContainer: {
    flex: 1,
  },
  dashboardContent: {
    padding: 20,
  },
  dashboardHeader: {
    marginBottom: 24,
  },
  dashboardTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 8,
  },
  dashboardSubtitle: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  cardTextContainer: {
    flex: 1,
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
  // Chat Styles
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    padding: 16,
    paddingBottom: 8,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '700' as const,
    color: colors.text,
    marginTop: 16,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 20,
  },
  messageContainer: {
    flexDirection: 'row',
    marginBottom: 16,
    gap: 8,
  },
  userMessageContainer: {
    justifyContent: 'flex-end',
  },
  aiMessageContainer: {
    justifyContent: 'flex-start',
  },
  messageAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userAvatar: {
    backgroundColor: colors.primary,
  },
  aiAvatar: {
    backgroundColor: colors.secondary,
  },
  messageBubble: {
    maxWidth: '75%',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
  },
  userBubble: {
    backgroundColor: colors.primary,
    borderBottomRightRadius: 4,
  },
  aiBubble: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderBottomLeftRadius: 4,
  },
  messageTime: {
    fontSize: 10,
    color: colors.textLight,
    marginTop: 4,
    opacity: 0.7,
  },
  loadingMessage: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
  },
  loadingMessageText: {
    fontSize: 14,
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingBottom: Platform.OS === 'ios' ? 12 : 16,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: 8,
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
    borderWidth: 1,
    borderColor: colors.border,
  },
  attachmentButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  sendButton: {
    backgroundColor: colors.primary,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
});
