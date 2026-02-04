import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  Animated,
  Platform,
  Alert,
  KeyboardAvoidingView,
  TouchableWithoutFeedback,
  Keyboard,
  RefreshControl,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Plus, X, Target, CheckCircle, Circle, Trash2, Edit2, Bell, BellOff } from 'lucide-react-native';
import colors from '@/constants/colors';
import { useApp } from '@/contexts/AppContext';
import { useAuth } from '@/contexts/AuthContext';
import { Goal } from '@/types';
import { cancelNotification, scheduleGoalNotification, scheduleHabitReminder } from '@/utils/notificationService';
import UpgradeModal from '@/components/UpgradeModal';

export default function GoalsScreen() {
  const { goals, addGoal, updateGoal, deleteGoal, refreshGoals } = useApp();
  const { user, checkPermission } = useAuth();
  const [showModal, setShowModal] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState(new Date());
  const [dueTime, setDueTime] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [purpose, setPurpose] = useState<any>(null);
  const [purposeLoading, setPurposeLoading] = useState(true);

  // Edit/Delete state
  const [showActionSheet, setShowActionSheet] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [habits, setHabits] = useState<{
    title: string;
    completed: boolean;
    reminderEnabled?: boolean;
    reminderTime?: string; // HH:MM
    notificationId?: string;
  }[]>([]);
  const [newHabit, setNewHabit] = useState('');
  const [newHabitTime, setNewHabitTime] = useState<Date | null>(null);
  const [showHabitTimePicker, setShowHabitTimePicker] = useState(false);

  const scaleAnim = React.useRef(new Animated.Value(0)).current;

  // Feature Check
  const checkAccess = () => {
    if (checkPermission && !checkPermission('canAccessGoals')) {
      setShowUpgradeModal(true);
      return false;
    }
    return true;
  };

  const fetchPurpose = async () => {
    if (!user?.uid) {
      console.log('[Goals] No user ID, skipping purpose fetch');
      setPurposeLoading(false);
      return;
    }

    console.log('[Goals] Fetching purpose statement for user:', user.uid);
    try {
      const apiService = (await import('@/utils/apiService')).default;
      const response = await apiService.get(`/api/users/${user.uid}/purpose`);
      console.log('[Goals] Purpose fetch response:', response);

      if (response.success) {
        if (response.purpose) {
          console.log('[Goals] Purpose data received:', Object.keys(response.purpose));
          setPurpose(response.purpose);
        } else {
          console.log('[Goals] No purpose data found for user');
          setPurpose(null);
        }
      } else {
        console.error('[Goals] Purpose fetch failed:', response);
        setPurpose(null);
      }
    } catch (error) {
      console.error('[Goals] Error fetching purpose:', error);
      setPurpose(null);
    } finally {
      setPurposeLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      refreshGoals();
      fetchPurpose();
    }, [user?.uid])
  );

  React.useEffect(() => {
    if (showModal) {
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 50,
        friction: 7,
      }).start();
    } else {
      scaleAnim.setValue(0);
    }
  }, [showModal, scaleAnim]);

  const handleAddGoal = async () => {
    if (!checkAccess()) return;
    if (!title.trim()) {
      Alert.alert('Required Field', 'Please enter a title for your goal.');
      return;
    }

    if (!dueDate) {
      Alert.alert('Required Field', 'Please select a due date.');
      return;
    }
    // ... rest of function
    const formattedDate = dueDate.toISOString().split('T')[0];
    const formattedTime = dueTime.toTimeString().split(' ')[0].substring(0, 5);

    // Process habits to schedule notifications if needed
    const processedHabits = await Promise.all(habits.map(async (habit) => {
      if (habit.reminderEnabled && habit.reminderTime) {
        // Cancel old if exists (re-scheduling)
        if (habit.notificationId) {
          await cancelNotification(habit.notificationId);
        }
        const notifId = await scheduleHabitReminder(title, habit.title, habit.reminderTime);
        return { ...habit, notificationId: notifId || undefined };
      } else if (!habit.reminderEnabled && habit.notificationId) {
        // If reminder disabled but has ID, cancel it
        await cancelNotification(habit.notificationId);
        return { ...habit, notificationId: undefined };
      }
      return habit;
    }));

    if (isEditing && selectedGoal) {
      const updatedGoal: Partial<Goal> = {
        title,
        description,
        dueDate: formattedDate,
        dueTime: formattedTime,
        habits: processedHabits,
      };
      updateGoal(selectedGoal.id, updatedGoal);

      // Cancel old notification and schedule new one
      if (selectedGoal.notificationId) {
        await cancelNotification(selectedGoal.notificationId);
      }
      const notificationId = await scheduleGoalNotification({
        ...selectedGoal,
        ...updatedGoal,
      } as Goal);
      if (notificationId) {
        await updateGoal(selectedGoal.id, { notificationId });
      }
    } else {
      const tempGoal: Goal = {
        id: Date.now().toString(),
        title,
        description,
        dueDate: formattedDate,
        dueTime: formattedTime,
        completed: false,
        createdAt: new Date().toISOString(),
        habits: processedHabits,
      };

      // Schedule notification first to get ID
      const notificationId = await scheduleGoalNotification(tempGoal);

      const newGoal: Goal = {
        ...tempGoal,
        notificationId: notificationId || undefined,
      };

      await addGoal(newGoal);
    }

    await refreshGoals();
    resetForm();
    setShowModal(false);
    setIsEditing(false);
    setSelectedGoal(null);
  };

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setDueDate(new Date());
    setDueTime(new Date());
    setHabits([]);
    setNewHabit('');
    setNewHabitTime(null);
  };

  const handleLongPress = (goal: Goal) => {
    // Optional: gate long press too, or just actions inside
    setSelectedGoal(goal);
    setShowActionSheet(true);
  };

  const handleEdit = () => {
    if (!checkAccess()) return;
    if (!selectedGoal) return;

    setTitle(selectedGoal.title);
    setDescription(selectedGoal.description || '');
    setDueDate(selectedGoal.dueDate ? new Date(selectedGoal.dueDate) : new Date());
    setDueTime(selectedGoal.dueTime ? new Date(`2000-01-01 ${selectedGoal.dueTime}`) : new Date());
    setHabits(selectedGoal.habits || []);

    setIsEditing(true);
    setShowActionSheet(false);
    setShowModal(true);
  };

  const handleDelete = async () => {
    if (!checkAccess()) return;
    if (!selectedGoal) return;

    // Cancel notification if exists
    if (selectedGoal.notificationId) {
      await cancelNotification(selectedGoal.notificationId);
    }

    // Cancel habit notifications
    if (selectedGoal.habits) {
      for (const habit of selectedGoal.habits) {
        if (habit.notificationId) {
          await cancelNotification(habit.notificationId);
        }
      }
    }

    await deleteGoal(selectedGoal.id);
    await refreshGoals();
    setShowActionSheet(false);
    setSelectedGoal(null);
  };

  const toggleGoalComplete = (goal: Goal) => {
    if (!checkAccess()) return;
    updateGoal(goal.id, { completed: !goal.completed });
  };

  const addHabitToState = () => {
    if (newHabit.trim()) {
      const reminderTimeStr = newHabitTime
        ? newHabitTime.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' })
        : undefined;

      setHabits([...habits, {
        title: newHabit.trim(),
        completed: false,
        reminderEnabled: !!newHabitTime,
        reminderTime: reminderTimeStr
      }]);
      setNewHabit('');
      setNewHabitTime(null);
    }
  };

  const removeHabitFromState = (index: number) => {
    setHabits(habits.filter((_, i) => i !== index));
  };

  const toggleHabit = (goal: Goal, habitIndex: number) => {
    if (!checkAccess()) return;
    if (!goal.habits) return;
    const updatedHabits = [...goal.habits];
    updatedHabits[habitIndex] = {
      ...updatedHabits[habitIndex],
      completed: !updatedHabits[habitIndex].completed,
    };
    updateGoal(goal.id, { habits: updatedHabits });
  };

  const calculateProgress = (habits?: { completed: boolean }[]) => {
    if (!habits || habits.length === 0) return 0;
    const completedCount = habits.filter(h => h.completed).length;
    return (completedCount / habits.length) * 100;
  };

  // Pull-to-refresh handler
  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refreshGoals(), fetchPurpose()]);
    setRefreshing(false);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <UpgradeModal
        visible={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        featureName="Goals"
        message="Upgrade to the Standard plan to set unlimited goals and track your habits."
      />
      {/* ... previous header logic unchanged ... */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Goals & Purpose</Text>
          <Text style={styles.subtitle}>Track your personal goals</Text>
        </View>
        <TouchableOpacity style={styles.addButton} onPress={() => {
          if (checkAccess()) setShowModal(true);
        }}>
          <Plus size={24} color={colors.surface} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
      >
        {purpose && (
          <View style={styles.purposeSection}>
            <View style={styles.purposeCard}>
              <View style={styles.purposeHeader}>
                <View style={styles.purposeIconContainer}>
                  <Target size={24} color={colors.primary} />
                </View>
                <View>
                  <Text style={styles.purposeTitle}>My Purpose Statement</Text>
                  <Text style={styles.purposeSubtitle}>From your introductory survey</Text>
                </View>
              </View>
              <View style={styles.purposeContent}>
                {purpose[1] && (
                  <View style={styles.purposeItem}>
                    <Text style={styles.purposeLabel}>My Vibe:</Text>
                    <Text style={styles.purposeText}>{purpose[1].join(', ')}</Text>
                  </View>
                )}
                {purpose[2] && (
                  <View style={styles.purposeItem}>
                    <Text style={styles.purposeLabel}>School Means:</Text>
                    <Text style={styles.purposeText}>{purpose[2].join(', ')}</Text>
                  </View>
                )}
                {purpose[3] && (
                  <View style={styles.purposeItem}>
                    <Text style={styles.purposeLabel}>Education Matters Because:</Text>
                    <Text style={styles.purposeText}>{purpose[3].join(', ')}</Text>
                  </View>
                )}
                {purpose[4] && (
                  <View style={styles.purposeItem}>
                    <Text style={styles.purposeLabel}>I Wanna Be:</Text>
                    <Text style={styles.purposeText}>{purpose[4].join(', ')}</Text>
                  </View>
                )}
                {purpose[5] && (
                  <View style={styles.purposeItem}>
                    <Text style={styles.purposeLabel}>I Stand For:</Text>
                    <Text style={styles.purposeText}>{purpose[5].join(', ')}</Text>
                  </View>
                )}
              </View>
            </View>
          </View>
        )}

        {goals.length === 0 ? (
          <View style={styles.emptyState}>
            <Target size={64} color={colors.textLight} />
            <Text style={styles.emptyText}>No goals yet</Text>
            <Text style={styles.emptySubtext}>Set your first goal and start tracking</Text>
          </View>
        ) : (
          <View style={styles.goalsList}>
            {goals.map((goal) => (
              <View key={goal.id} style={styles.goalCard}>
                <TouchableOpacity
                  style={styles.goalHeader}
                  onPress={() => toggleGoalComplete(goal)}
                  onLongPress={() => handleLongPress(goal)}
                >
                  <View style={styles.goalHeaderLeft}>
                    {goal.completed ? (
                      <CheckCircle size={28} color={colors.success} />
                    ) : (
                      <Circle size={28} color={colors.primary} />
                    )}
                    <View style={styles.goalHeaderText}>
                      <Text style={[styles.goalTitle, goal.completed && styles.goalTitleCompleted]}>
                        {goal.title}
                      </Text>
                      {goal.description && (
                        <Text style={styles.goalDescription}>{goal.description}</Text>
                      )}
                      {goal.dueDate && (
                        <Text style={styles.goalDueDate}>
                          Due: {new Date(goal.dueDate).toLocaleDateString()}
                          {goal.dueTime && ` at ${goal.dueTime}`}
                        </Text>
                      )}
                    </View>
                  </View>
                </TouchableOpacity>

                {/* Habits Section */}
                {goal.habits && goal.habits.length > 0 && (
                  <View style={styles.habitsSection}>
                    <View style={styles.progressHeader}>
                      <Text style={styles.habitsTitle}>Daily Habits</Text>
                      <Text style={styles.progressText}>
                        {Math.round(calculateProgress(goal.habits))}%
                      </Text>
                    </View>
                    <View style={styles.progressBarContainer}>
                      <View
                        style={[
                          styles.progressBar,
                          { width: `${calculateProgress(goal.habits)}%` }
                        ]}
                      />
                    </View>
                    <View>
                      {goal.habits.map((habit, index) => (
                        <TouchableOpacity
                          key={index}
                          style={styles.habitItem}
                          onPress={() => toggleHabit(goal, index)}
                        >
                          {habit.completed ? (
                            <CheckCircle size={20} color={colors.primary} />
                          ) : (
                            <Circle size={20} color={colors.border} />
                          )}
                          <Text style={[
                            styles.habitTitle,
                            habit.completed && styles.habitTitleCompleted
                          ]}>
                            {habit.title}
                          </Text>
                          {habit.reminderEnabled && habit.reminderTime && (
                            <View style={styles.habitBadge}>
                              <Bell size={12} color={colors.primary} />
                              <Text style={styles.habitBadgeText}>{habit.reminderTime}</Text>
                            </View>
                          )}
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                )}
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      <Modal visible={showModal} transparent animationType="fade" onRequestClose={() => setShowModal(false)}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{ flex: 1 }}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setShowModal(false)}
          >
            <TouchableOpacity
              activeOpacity={1}
              onPress={(e) => e.stopPropagation()}
              style={{ width: '100%', alignItems: 'center' }}
            >
              <Animated.View style={[styles.modalContent, { transform: [{ scale: scaleAnim }] }]}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>{isEditing ? 'Edit Goal' : 'Create Goal'}</Text>
                  <TouchableOpacity onPress={() => {
                    setShowModal(false);
                    if (isEditing) {
                      setIsEditing(false);
                      setSelectedGoal(null);
                      resetForm();
                    }
                  }}>
                    <X size={24} color={colors.text} />
                  </TouchableOpacity>
                </View>

                <ScrollView
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={styles.scrollContent}
                  keyboardShouldPersistTaps="handled"
                >
                  <Text style={styles.label}>Goal Title *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Enter your goal"
                    placeholderTextColor={colors.textLight}
                    value={title}
                    onChangeText={setTitle}
                  />

                  <Text style={styles.label}>Description</Text>
                  <TextInput
                    style={[styles.input, styles.textArea]}
                    placeholder="Describe your goal"
                    placeholderTextColor={colors.textLight}
                    value={description}
                    onChangeText={setDescription}
                    multiline
                    numberOfLines={3}
                  />

                  {/* ... Due Date/Time pickers (unchanged code omitted for brevity if not changing) ... */}
                  <Text style={styles.label}>Due Date *</Text>
                  <TouchableOpacity
                    style={styles.input}
                    onPress={() => setShowDatePicker(true)}
                  >
                    <Text style={{ color: colors.text }}>
                      {dueDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </Text>
                  </TouchableOpacity>
                  <DateTimePickerModal
                    isVisible={showDatePicker}
                    mode="date"
                    date={dueDate}
                    onConfirm={(date) => {
                      setShowDatePicker(false);
                      setDueDate(date);
                    }}
                    onCancel={() => setShowDatePicker(false)}
                  />

                  <Text style={styles.label}>Due Time</Text>
                  <TouchableOpacity
                    style={styles.input}
                    onPress={() => setShowTimePicker(true)}
                  >
                    <Text style={{ color: colors.text }}>
                      {dueTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                  </TouchableOpacity>
                  <DateTimePickerModal
                    isVisible={showTimePicker}
                    mode="time"
                    date={dueTime}
                    onConfirm={(time) => {
                      setShowTimePicker(false);
                      setDueTime(time);
                    }}
                    onCancel={() => setShowTimePicker(false)}
                  />


                  <Text style={styles.label}>Daily Habits</Text>
                  <View style={styles.habitInputRow}>
                    <TextInput
                      style={[styles.input, styles.habitInput]}
                      placeholder="Add a habit "
                      placeholderTextColor={colors.textLight}
                      value={newHabit}
                      onChangeText={setNewHabit}
                    />
                    <TouchableOpacity
                      style={[styles.timeButton, newHabitTime && styles.timeButtonActive]}
                      onPress={() => setShowHabitTimePicker(true)}
                    >
                      {newHabitTime ? <Bell size={20} color="white" /> : <BellOff size={20} color={colors.textLight} />}
                    </TouchableOpacity>
                    <DateTimePickerModal
                      isVisible={showHabitTimePicker}
                      mode="time"
                      onConfirm={(time) => {
                        setNewHabitTime(time);
                        setShowHabitTimePicker(false);
                      }}
                      onCancel={() => setShowHabitTimePicker(false)}
                    />
                    <TouchableOpacity
                      style={styles.addHabitButton}
                      onPress={addHabitToState}
                    >
                      <Plus size={24} color={colors.surface} />
                    </TouchableOpacity>
                  </View>
                  {newHabitTime && (
                    <View style={styles.reminderPreview}>
                      <Text style={styles.reminderPreviewText}>
                        Reminder set for: {newHabitTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                      </Text>
                      <TouchableOpacity onPress={() => setNewHabitTime(null)}>
                        <X size={16} color={colors.textSecondary} />
                      </TouchableOpacity>
                    </View>
                  )}

                  <View style={styles.habitsList}>
                    {habits.map((habit, index) => (
                      <View key={index} style={styles.habitChip}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.habitChipText}>{habit.title}</Text>
                          {habit.reminderEnabled && habit.reminderTime && (
                            <Text style={styles.habitChipSubtext}>🔔 {habit.reminderTime}</Text>
                          )}
                        </View>
                        <TouchableOpacity onPress={() => removeHabitFromState(index)}>
                          <X size={20} color={colors.textSecondary} />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>

                  <TouchableOpacity
                    style={styles.createButton}
                    onPress={handleAddGoal}
                  >
                    <Text style={styles.createButtonText}>{isEditing ? 'Update Goal' : 'Create Goal'}</Text>
                  </TouchableOpacity>
                </ScrollView>
              </Animated.View>
            </TouchableOpacity>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </Modal>

      {/* Action Sheet Modal */}
      <Modal
        visible={showActionSheet}
        transparent
        animationType="fade"
        onRequestClose={() => setShowActionSheet(false)}
      >
        <TouchableOpacity
          style={styles.actionSheetOverlay}
          activeOpacity={1}
          onPress={() => setShowActionSheet(false)}
        >
          <View style={styles.actionSheetContent}>
            <TouchableOpacity style={styles.actionButton} onPress={handleEdit}>
              <Edit2 size={20} color={colors.primary} />
              <Text style={styles.actionButtonText}>Edit Goal</Text>
            </TouchableOpacity>
            <View style={styles.actionDivider} />
            <TouchableOpacity style={styles.actionButton} onPress={handleDelete}>
              <Trash2 size={20} color="#FF3B30" />
              <Text style={[styles.actionButtonText, { color: '#FF3B30' }]}>Delete Goal</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
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
  addButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  scrollView: {
    flex: 1,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '600' as const,
    color: colors.textSecondary,
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: colors.textLight,
    marginTop: 8,
  },
  goalsList: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  goalCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: colors.cardShadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  goalHeader: {
    marginBottom: 12,
  },
  goalHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  goalHeaderText: {
    flex: 1,
    marginLeft: 12,
  },
  goalTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: colors.text,
    marginBottom: 4,
  },
  goalTitleCompleted: {
    textDecorationLine: 'line-through',
    color: colors.textSecondary,
  },
  goalDescription: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  goalDueDate: {
    fontSize: 12,
    color: colors.textLight,
  },
  habitsSection: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 12,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  habitsTitle: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: colors.text,
  },
  progressText: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: colors.primary,
  },
  progressBarContainer: {
    height: 6,
    backgroundColor: colors.background,
    borderRadius: 3,
    marginBottom: 12,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 3,
  },
  habitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  habitTitle: {
    fontSize: 14,
    color: colors.text,
    marginLeft: 10,
    flex: 1,
  },
  habitTitleCompleted: {
    textDecorationLine: 'line-through',
    color: colors.textSecondary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderRadius: 24,
    padding: 24,
    width: '100%',
    maxWidth: 500,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: colors.text,
  },
  label: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: colors.text,
    marginBottom: 8,
    marginTop: 16,
  },
  input: {
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  habitInputRow: {
    flexDirection: 'row',
    gap: 8,
  },
  habitInput: {
    flex: 1,
  },
  timeButton: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  addHabitButton: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  habitsList: {
    marginTop: 12,
    gap: 8,
  },
  habitChip: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.background,
    padding: 12,
    borderRadius: 10,
  },
  habitChipText: {
    fontSize: 14,
    color: colors.text,
    flex: 1,
  },
  habitBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    gap: 4,
  },
  habitBadgeText: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '500',
  },
  reminderPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F3F4F6',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  reminderPreviewText: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '500',
  },
  habitChipSubtext: {
    fontSize: 12,
    color: colors.primary,
    marginTop: 2,
  },
  createButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    padding: 18,
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 8,
  },
  createButtonDisabled: {
    opacity: 0.5,
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: colors.surface,
  },
  actionSheetOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  actionSheetContent: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginLeft: 12,
  },
  purposeSection: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  purposeCard: {
    backgroundColor: colors.surface,
    borderRadius: 24,
    padding: 20,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 1,
    borderColor: colors.primary + '20',
  },
  purposeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  purposeIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary + '10',
    alignItems: 'center',
    justifyContent: 'center',
  },
  purposeTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
  },
  purposeSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  purposeContent: {
    gap: 16,
  },
  purposeItem: {
    gap: 4,
  },
  purposeLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  purposeText: {
    fontSize: 15,
    color: colors.text,
    lineHeight: 22,
    fontWeight: '500',
  },
  actionDivider: {
    height: 1,
    backgroundColor: colors.border,
  },
  scrollContent: {
    paddingBottom: 20,
  },
});
