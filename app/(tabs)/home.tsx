import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Button,
  RefreshControl,
} from 'react-native';
import YoutubePlayer from 'react-native-youtube-iframe';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import colors from '@/constants/colors';
import { useApp } from '@/contexts/AppContext';
import { useStreak } from '@/contexts/StreakContext';
import { useAuth } from '@/contexts/AuthContext';
import { Zap, Flame, Trophy, ListChecks, CheckCircle, Circle, Clock, Sparkles } from 'lucide-react-native';
import * as Sentry from '@sentry/react-native';
import { formatStringTime12H } from '@/utils/timeUtils';
import UpgradeModal from '@/components/UpgradeModal';
import TrialCountdownModal from '@/components/TrialCountdownModal';
import DailyStreakModal from '@/components/DailyStreakModal';
import StreakFireAnimation from '@/components/StreakFireAnimation';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useResponsive } from '@/utils/responsive';
import ResponsiveContainer from '@/components/ResponsiveContainer';

export default function HomeScreen() {
  const ctx = useApp();
  const sortedTasks = ctx?.sortedTasks || [];
  const videoConfig = ctx?.videoConfig;
  const isLoading = ctx?.isLoading;
  const refreshAllData = ctx?.refreshAllData;

  // Use optional chaining or try-catch for useStreak as it might be missing during early render/crashes
  let streakCtx: any = {};
  try {
    streakCtx = useStreak();
  } catch (e) {
    console.warn('StreakContext not found in HomeScreen, using fallback');
  }

  const {
    streakData,
    refreshStreak,
    showDailyModal,
    setShowDailyModal,
    showAnimation,
    setShowAnimation,
    animStreakNumber,
    isLoading: isStreakLoading
  } = streakCtx;

  const { user, checkPermission, isTrialActive, getTrialDaysRemaining } = useAuth();
  const router = useRouter();

  const [refreshing, setRefreshing] = useState(false);
  const [showTrialModal, setShowTrialModal] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      refreshAllData({ silent: true }),
      refreshStreak()
    ]);
    setRefreshing(false);
  };

  const educationQuotes = useMemo(() => [
    "Education is the most powerful weapon which you can use to change the world. - Nelson Mandela",
    "The beautiful thing about learning is that no one can take it away from you. - B.B. King",
    "Education is not preparation for life; education is life itself. - John Dewey",
    "Live as if you were to die tomorrow. Learn as if you were to live forever. - Mahatma Gandhi",
    "The roots of education are bitter, but the fruit is sweet. - Aristotle",
    "Intelligence plus character—that is the goal of true education. - Martin Luther King Jr.",
  ], []);

  const [currentQuote, setCurrentQuote] = useState(educationQuotes[0]);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  useEffect(() => {
    const checkTrialModal = async () => {
      if (isTrialActive && isTrialActive()) {
        const lastShown = await AsyncStorage.getItem('@trial_modal_last_shown');
        const today = new Date().toDateString();

        if (lastShown !== today) {
          setShowTrialModal(true);
          await AsyncStorage.setItem('@trial_modal_last_shown', today);
        }
      }
    };

    checkTrialModal();
  }, [user]);
  const lastFocusRef = React.useRef(0);

  // Refresh gamification points whenever coming back to this screen
  useFocusEffect(
    useCallback(() => {
      const now = Date.now();
      // Only refresh if it's been more than 30 seconds since last focus refresh
      // This prevents loops if focus triggers too rapidly
      if (typeof refreshStreak === 'function' && now - lastFocusRef.current > 30000) {
        lastFocusRef.current = now;
        refreshStreak({ silent: true });
      }
    }, [refreshStreak])
  );

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentQuote(educationQuotes[Math.floor(Math.random() * educationQuotes.length)]);
    }, 10000);
    return () => clearInterval(interval);
  }, [educationQuotes]);

  // Get today's tasks info
  const todayTasksInfo = useMemo(() => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    const todayStr = `${year}-${month}-${day}`;

    const todayTasks = sortedTasks.filter(task => task.dueDate === todayStr);
    return {
      completed: todayTasks.filter(t => t.completed).length,
      total: todayTasks.length,
      remaining: todayTasks.filter(t => !t.completed).length
    };
  }, [sortedTasks]);

  // Get the 3 closest upcoming tasks (not completed)
  const upcomingTasks = useMemo(() => {
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

  const { isTablet, normalize, width } = useResponsive();

  if (isLoading || isStreakLoading || !ctx) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Crushing your goals...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
      <ResponsiveContainer>
        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.scrollContent,
            isTablet && { paddingHorizontal: 40 }
          ]}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={[colors.primary]}
              tintColor={colors.primary}
            />
          }
        >
          <View style={styles.heroSection}>
            <Text style={[styles.appTitle, { fontSize: normalize(28) }]}>Cause Student AI Planner</Text>
            <Text style={[styles.heroSubtitle, { fontSize: normalize(14) }]}>Making a difference, one task at a time</Text>

            <View style={[styles.statsGrid, isTablet && { gap: 16 }]}>
              <View style={[styles.statBox, isTablet && styles.statBoxTablet, { backgroundColor: '#E0F2FE' }]}>
                <View style={[styles.statIconContainer, { backgroundColor: 'white' }]}>
                  <ListChecks size={normalize(20)} color={colors.primary} />
                </View>
                <Text style={[styles.statValue, { fontSize: normalize(16) }]}>{todayTasksInfo.remaining}</Text>
                <Text style={[styles.statLabel, { fontSize: normalize(9) }]}>Today's Tasks</Text>
              </View>

              <View style={[styles.statBox, isTablet && styles.statBoxTablet, { backgroundColor: '#EFF6FF' }]}>
                <View style={[styles.statIconContainer, { backgroundColor: 'white' }]}>
                  <Flame size={normalize(20)} color={colors.secondary} />
                </View>
                <Text style={[styles.statValue, { fontSize: normalize(16) }]}>{streakData?.current || 0}</Text>
                <Text style={[styles.statLabel, { fontSize: normalize(9) }]}>Current Streak</Text>
              </View>

              <View style={[styles.statBox, isTablet && styles.statBoxTablet, { backgroundColor: '#DBEAFE' }]}>
                <View style={[styles.statIconContainer, { backgroundColor: 'white' }]}>
                  <Zap size={normalize(20)} color={colors.primaryLight} />
                </View>
                <Text style={[styles.statValue, { fontSize: normalize(16) }]}>{streakData?.points || 0}</Text>
                <Text style={[styles.statLabel, { fontSize: normalize(9) }]}>Total Points</Text>
              </View>

              <View style={[styles.statBox, isTablet && styles.statBoxTablet, { backgroundColor: '#D1FAE5' }]}>
                <View style={[styles.statIconContainer, { backgroundColor: 'white' }]}>
                  <Trophy size={normalize(20)} color={colors.success} />
                </View>
                <Text style={[styles.statValue, { fontSize: normalize(16) }]}>{streakData?.level || 1}</Text>
                <Text style={[styles.statLabel, { fontSize: normalize(9) }]}>Levels</Text>
              </View>
            </View>



          <TouchableOpacity
            style={styles.importButton}
            onPress={() => {
              if (checkPermission && checkPermission('canSyncSyllabus')) {
                router.push('/syllabus-parser');
              } else {
                setShowUpgradeModal(true);
              }
            }}
          >
            <Clock size={20} color={colors.primary} />
            <Text style={styles.importButtonText}>Import Syllabus</Text>
            {isTrialActive && isTrialActive() && (
              <View style={styles.trialBadge}>
                <Sparkles size={12} color={colors.premium} />
                <Text style={styles.trialBadgeText}>Premium</Text>
              </View>
            )}
            {!checkPermission('canSyncSyllabus') && (
              <Sparkles size={16} color={colors.premium} style={{ marginLeft: 'auto' }} />
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.videoSection}>
          <Text style={[styles.sectionTitle, { fontSize: normalize(20) }]}>Student Pep Talk</Text>
          <Text style={[styles.videoSubtitle, { fontSize: normalize(14) }]}>Lights, Camera, Win!  - Submit your vid for prizes</Text>
          <View style={[styles.videoContainer, isTablet && { maxHeight: 400 }]}>
            <YoutubePlayer
              height={isTablet ? 360 : 190}
              width={"100%"}
              videoId={videoConfig?.homeVideoId || "VRSnKzgVTiU"}
              play={false}
            />
          </View>
          <Text style={[styles.dynamicVideoTitle, { fontSize: normalize(16) }]}>{videoConfig?.homeVideoTitle || "Motivation from students like you"}</Text>
        </View>

        <View style={styles.quoteSection}>
          <Text style={[styles.quoteText, { fontSize: normalize(15) }]}>&ldquo;{currentQuote}&rdquo;</Text>
        </View>

        {upcomingTasks.length > 0 && (
          <View style={styles.tasksSection}>
            <View style={styles.tasksSectionHeader}>
              <Text style={[styles.sectionTitle, { fontSize: normalize(20) }]}> Don't let deadlines sneak up on you!</Text>
              <TouchableOpacity onPress={() => router.push('/(tabs)/tasks')}>
                <Text style={[styles.viewAllText, { fontSize: normalize(14) }]}>View All</Text>
              </TouchableOpacity>
            </View>
            <View style={isTablet ? styles.taskListTablet : null}>
              {upcomingTasks
                .filter(task => task.id) 
                .map((task, index) => (
                  <TouchableOpacity
                    key={`${task.id}-${index}`}
                    style={[styles.taskCard, isTablet && styles.taskCardTablet]}
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
                      <Text style={[styles.taskTitle, { fontSize: normalize(15) }]} numberOfLines={1}>
                        {task.description}
                      </Text>
                      <View style={styles.taskMeta}>
                        <View style={[styles.typeBadge, { backgroundColor: colors.taskColors[task.type] + '20' }]}>
                          <Text style={[styles.typeBadgeText, { color: colors.taskColors[task.type], fontSize: normalize(10) }]}>
                            {task.type}
                          </Text>
                        </View>
                        {task.className && (
                          <Text style={[styles.taskClass, { fontSize: normalize(11) }]}>{task.className}</Text>
                        )}
                      </View>
                      <View style={styles.taskDateRow}>
                        <Clock size={12} color={colors.textLight} />
                        <Text style={[styles.taskDate, { fontSize: normalize(11) }]}>
                          {getDaysUntil(task.dueDate)}
                          {task.dueTime && ` at ${formatStringTime12H(task.dueTime)}`}
                        </Text>
                      </View>
                    </View>
                    <View style={[styles.priorityDot, { backgroundColor: colors.priorityColors[task.priority] }]} />
                  </TouchableOpacity>
                ))}
            </View>
          </View>
        )}
      </ScrollView>
      </ResponsiveContainer>


      <UpgradeModal
        visible={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        featureName="Syllabus Parser"
        message="Automatically import your assignments and exams from your syllabus with the premium plan!"
      />

      <StreakFireAnimation
        visible={showAnimation}
        streakNumber={animStreakNumber}
        onFinish={() => setShowAnimation(false)}
      />

      <DailyStreakModal
        visible={showDailyModal}
        streakCount={streakData?.current || 0}
        onClose={() => setShowDailyModal(false)}
      />

      <TrialCountdownModal
        visible={showTrialModal}
        onClose={() => setShowTrialModal(false)}
        daysRemaining={getTrialDaysRemaining ? getTrialDaysRemaining() : 0}
        onUpgrade={() => {
          setShowTrialModal(false);
          router.push('/(tabs)/account');
        }}
      />
    </SafeAreaView >
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    // paddingBottom: 50,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 20,
  },
  heroSection: {
    paddingHorizontal: 20,
    paddingTop: 8,
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
    marginBottom: 20,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    gap: 0,
  },
  statBox: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 8,
    alignItems: 'center',
    width: '23.5%', // 4 columns side by side
    shadowColor: colors.cardShadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    marginBottom: 10,
  },
  statBoxTablet: {
    width: '22%',
    padding: 16,
    borderRadius: 16,
  },
  statIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.text,
  },
  statLabel: {
    fontSize: 9,
    color: colors.textSecondary,
    marginTop: 1,
    textAlign: 'center',
  },
  tasksSection: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  tasksSectionHeader: {
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  viewAllText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: colors.primary,
    textAlign: "right",
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
  taskListTablet: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  taskCardTablet: {
    width: '48%', // 2 columns
    marginBottom: 0,
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
    marginBottom: 4,
    textAlign: "center",
  },
  videoSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 12,
    textAlign: "center",
  },
  videoContainer: {
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: colors.cardShadow,
    marginBottom: 12,
  },
  dynamicVideoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
    marginTop: 4,
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
  trialBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.premium + '15',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    marginLeft: 8,
    gap: 4,
  },
  trialBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.premium,
  },
});

