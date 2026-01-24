import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Button,
} from 'react-native';
import YoutubePlayer from 'react-native-youtube-iframe';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { CheckCircle, Circle, Clock } from 'lucide-react-native';
import colors from '@/constants/colors';
import { useApp } from '@/contexts/AppContext';
import * as Sentry from '@sentry/react-native';

export default function HomeScreen() {
  const { sortedTasks, videoConfig, isLoading, refreshTasks } = useApp();
  const router = useRouter();

  useFocusEffect(
    useCallback(() => {
      refreshTasks();
    }, [])
  );

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

  // Get the 3 closest upcoming tasks (not completed)
  const upcomingTasks = useMemo(() => {
    const now = new Date();
    return sortedTasks
      .filter(task => !task.completed)
      .slice(0, 3);
  }, [sortedTasks]);

  const getDaysUntil = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    date.setHours(0, 0, 0, 0);
    const diff = Math.ceil((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (diff === 0) return 'Today';
    if (diff === 1) return 'Tomorrow';
    if (diff === -1) return 'Yesterday';
    if (diff < 0) return `${Math.abs(diff)} days ago`;
    return `In ${diff} days`;
  };

  if (isLoading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.heroSection}>
          <Text style={styles.appTitle}>Cause Student AI Planner</Text>
          <Text style={styles.heroSubtitle}>Making a difference, one task at a time</Text>
          <TouchableOpacity
            style={styles.importButton}
            onPress={() => router.push('/syllabus-parser')}
          >
            <Clock size={20} color={colors.primary} />
            <Text style={styles.importButtonText}>Import Syllabus</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.quoteSection}>
          <Text style={styles.quoteText}>&ldquo;{currentQuote}&rdquo;</Text>
        </View>

        {upcomingTasks.length > 0 && (
          <View style={styles.tasksSection}>
            <View style={styles.tasksSectionHeader}>
              <Text style={styles.sectionTitle}>Upcoming Tasks</Text>
              <TouchableOpacity onPress={() => router.push('/(tabs)/tasks')}>
                <Text style={styles.viewAllText}>View All</Text>
              </TouchableOpacity>
            </View>
            {upcomingTasks
              .filter(task => task.id) // Filter out tasks without IDs
              .map((task, index) => (
                <TouchableOpacity
                  key={`${task.id}-${index}`}
                  style={styles.taskCard}
                  onPress={() => router.push('/(tabs)/tasks')}
                >
                  <View style={[styles.taskIcon, { backgroundColor: colors.taskColors[task.type] }]}>
                    {task.completed ? (
                      <CheckCircle size={20} color={colors.surface} />
                    ) : (
                      <Circle size={20} color={colors.surface} />
                    )}
                  </View>
                  <View style={styles.taskContent}>
                    <Text style={styles.taskTitle} numberOfLines={1}>
                      {task.description}
                    </Text>
                    <View style={styles.taskMeta}>
                      <View style={[styles.typeBadge, { backgroundColor: colors.taskColors[task.type] + '20' }]}>
                        <Text style={[styles.typeBadgeText, { color: colors.taskColors[task.type] }]}>
                          {task.type}
                        </Text>
                      </View>
                      {task.className && (
                        <Text style={styles.taskClass}>{task.className}</Text>
                      )}
                    </View>
                    <View style={styles.taskDateRow}>
                      <Clock size={12} color={colors.textLight} />
                      <Text style={styles.taskDate}>
                        {getDaysUntil(task.dueDate)}
                        {task.dueTime && ` at ${task.dueTime}`}
                      </Text>
                    </View>
                  </View>
                  <View style={[styles.priorityDot, { backgroundColor: colors.priorityColors[task.priority] }]} />
                </TouchableOpacity>
              ))}
          </View>
        )}

        <View style={styles.videoSection}>
          <Text style={styles.sectionTitle}>Student Inspirational Talk</Text>
          <View style={styles.videoContainer}>
            <YoutubePlayer
              height={190}
              width={"100%"}
              videoId={videoConfig?.homeVideoId || "VRSnKzgVTiU"}
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
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
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
  tasksSection: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  tasksSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  viewAllText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: colors.primary,
  },
  taskCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: colors.cardShadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  taskIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  taskContent: {
    flex: 1,
  },
  taskTitle: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: colors.text,
    marginBottom: 4,
  },
  taskMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginRight: 8,
  },
  typeBadgeText: {
    fontSize: 10,
    fontWeight: '600' as const,
    textTransform: 'capitalize',
  },
  taskClass: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  taskDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  taskDate: {
    fontSize: 11,
    color: colors.textLight,
  },
  priorityDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginLeft: 8,
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
  importButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginTop: 16,
    shadowColor: colors.cardShadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  importButtonText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
});

