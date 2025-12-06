import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
} from 'react-native';
import YoutubePlayer from 'react-native-youtube-iframe';
import { SafeAreaView } from 'react-native-safe-area-context';
import colors from '@/constants/colors';

export default function HomeScreen() {
  const educationQuotes = useMemo(() => [
    "Education is the most powerful weapon which you can use to change the world. - Nelson Mandela",
    "The beautiful thing about learning is that no one can take it away from you. - B.B. King",
    "Education is not preparation for life; education is life itself. - John Dewey",
    "Live as if you were to die tomorrow. Learn as if you were to live forever. - Mahatma Gandhi",
    "The roots of education are bitter, but the fruit is sweet. - Aristotle",
    "Intelligence plus character—that is the goal of true education. - Martin Luther King Jr.",
  ], []);

  const [currentQuote, setCurrentQuote] = useState(educationQuotes[0]);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentQuote(educationQuotes[Math.floor(Math.random() * educationQuotes.length)]);
    }, 10000);
    return () => clearInterval(interval);
  }, [educationQuotes]);

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.heroSection}>
          <Text style={styles.appTitle}>Cause Student AI Planner</Text>
          <Text style={styles.heroSubtitle}>Making a difference, one task at a time</Text>
        </View>

        <View style={styles.quoteSection}>
          <Text style={styles.quoteText}>&ldquo;{currentQuote}&rdquo;</Text>
        </View>

        <View style={styles.videoSection}>
          <Text style={styles.sectionTitle}>Student Inspirational Talk</Text>
          <View style={styles.videoContainer}>
            <YoutubePlayer
              height={190}
              width={"100%"}
              videoId="VRSnKzgVTiU"
              play={false}
            />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
  },
  heroSection: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 20,
    alignItems: 'center',
  },
  appTitle: {
    fontSize: 28,
    fontWeight: '800' as const,
    color: colors.text,
    textAlign: 'center',
    marginBottom: 4,
  },
  heroSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 0,
  },
  quoteSection: {
    paddingHorizontal: 20,
    paddingVertical: 24,
    marginHorizontal: 20,
    marginBottom: 20,
    backgroundColor: colors.primary + '10',
    borderRadius: 16,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
  },
  quoteText: {
    fontSize: 15,
    lineHeight: 24,
    color: colors.text,
    fontStyle: 'italic',
    textAlign: 'center',
  },
  videoSection: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: colors.text,
    marginBottom: 12,
  },
  videoContainer: {
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: colors.cardShadow,
  },
});
