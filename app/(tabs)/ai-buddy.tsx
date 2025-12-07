import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Sparkles, Camera, FileText, Send } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import colors from '@/constants/colors';
import Mascot from '@/components/Mascot';

type Mode = 'homework' | 'summarize' | 'quiz';

export default function AIBuddyScreen() {
  const [mode, setMode] = useState<Mode>('homework');
  const [input, setInput] = useState('');
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.8,
      base64: true,
    });

    if (!result.canceled && result.assets[0].base64) {
      setSelectedImage(`data:image/jpeg;base64,${result.assets[0].base64}`);
    }
  };

  const handleSubmit = async () => {
    if (!input && !selectedImage) return;

    setLoading(true);
    setResponse('');

    try {
      // Simulate a brief delay for better UX
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Placeholder response
      setResponse(
        '🚧 AI Features Coming Soon!\n\n' +
        'We\'re working on integrating advanced AI capabilities to help you with:\n\n' +
        '• Homework assistance and step-by-step explanations\n' +
        '• Text summarization for your study materials\n' +
        '• Custom quiz generation to test your knowledge\n\n' +
        'Stay tuned for updates!'
      );
    } catch (error) {
      setResponse('Sorry, something went wrong. Please try again.');
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const clearAll = () => {
    setInput('');
    setResponse('');
    setSelectedImage(null);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>AI Study Buddy</Text>
          <Text style={styles.subtitle}>Your personal learning assistant</Text>
        </View>
        <Mascot size={60} />
      </View>

      <View style={styles.modeSelector}>
        <TouchableOpacity
          style={[styles.modeButton, mode === 'homework' && styles.modeButtonActive]}
          onPress={() => { setMode('homework'); clearAll(); }}
        >
          <Camera size={20} color={mode === 'homework' ? colors.surface : colors.text} />
          <Text style={[styles.modeButtonText, mode === 'homework' && styles.modeButtonTextActive]}>
            Homework Help
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.modeButton, mode === 'summarize' && styles.modeButtonActive]}
          onPress={() => { setMode('summarize'); clearAll(); }}
        >
          <FileText size={20} color={mode === 'summarize' ? colors.surface : colors.text} />
          <Text style={[styles.modeButtonText, mode === 'summarize' && styles.modeButtonTextActive]}>
            Summarize
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.modeButton, mode === 'quiz' && styles.modeButtonActive]}
          onPress={() => { setMode('quiz'); clearAll(); }}
        >
          <Sparkles size={20} color={mode === 'quiz' ? colors.surface : colors.text} />
          <Text style={[styles.modeButtonText, mode === 'quiz' && styles.modeButtonTextActive]}>
            Quiz Me
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>
            {mode === 'homework' && '📚 Upload or describe your homework'}
            {mode === 'summarize' && '📝 Paste text to summarize'}
            {mode === 'quiz' && '🎯 Paste your study material'}
          </Text>
          <Text style={styles.infoText}>
            {mode === 'homework' && 'I\'ll help you understand the concepts and guide you through the solution.'}
            {mode === 'summarize' && 'I\'ll create a clear, concise summary of your text.'}
            {mode === 'quiz' && 'I\'ll create practice questions to test your knowledge.'}
          </Text>
        </View>

        {mode === 'homework' && (
          <TouchableOpacity style={styles.imagePickerButton} onPress={pickImage}>
            <Camera size={24} color={colors.primary} />
            <Text style={styles.imagePickerText}>
              {selectedImage ? 'Change Image' : 'Upload Homework Image'}
            </Text>
          </TouchableOpacity>
        )}

        {selectedImage && (
          <View style={styles.imagePreview}>
            <Text style={styles.imagePreviewText}>Image selected ✓</Text>
          </View>
        )}

        <View style={styles.inputContainer}>
          <TextInput
            style={styles.textInput}
            placeholder={
              mode === 'homework'
                ? 'Or describe your homework question...'
                : mode === 'summarize'
                ? 'Paste your text here...'
                : 'Paste your study notes here...'
            }
            placeholderTextColor={colors.textLight}
            value={input}
            onChangeText={setInput}
            multiline
            numberOfLines={6}
            textAlignVertical="top"
          />
        </View>

        <TouchableOpacity
          style={[styles.submitButton, (!input && !selectedImage) && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={!input && !selectedImage}
        >
          {loading ? (
            <ActivityIndicator color={colors.surface} />
          ) : (
            <>
              <Send size={20} color={colors.surface} />
              <Text style={styles.submitButtonText}>
                {mode === 'homework' ? 'Get Help' : mode === 'summarize' ? 'Summarize' : 'Generate Quiz'}
              </Text>
            </>
          )}
        </TouchableOpacity>

        {response && (
          <View style={styles.responseCard}>
            <View style={styles.responseHeader}>
              <Sparkles size={20} color={colors.primary} />
              <Text style={styles.responseTitle}>AI Response</Text>
            </View>
            <Text style={styles.responseText}>{response}</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  title: {
    fontSize: 32,
    fontWeight: '800' as const,
    color: colors.text,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 4,
  },
  mascotContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.primaryLight + '30',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modeSelector: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 16,
    gap: 8,
  },
  modeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  modeButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  modeButtonText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: colors.text,
  },
  modeButtonTextActive: {
    color: colors.surface,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  infoCard: {
    backgroundColor: colors.secondary + '20',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: colors.secondary,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: colors.text,
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  imagePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: colors.border,
    borderStyle: 'dashed',
  },
  imagePickerText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: colors.primary,
  },
  imagePreview: {
    backgroundColor: colors.success + '20',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    alignItems: 'center',
  },
  imagePreviewText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: colors.success,
  },
  inputContainer: {
    marginBottom: 16,
  },
  textInput: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    fontSize: 15,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
    minHeight: 120,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: colors.primary,
    borderRadius: 12,
    padding: 18,
    marginBottom: 16,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: colors.surface,
  },
  responseCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: colors.cardShadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  responseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  responseTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: colors.text,
  },
  responseText: {
    fontSize: 15,
    color: colors.text,
    lineHeight: 24,
  },
});
