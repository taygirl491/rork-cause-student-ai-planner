import React, { useState, useCallback, useEffect } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';
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
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  TouchableWithoutFeedback,
  Keyboard,
  Pressable,
  RefreshControl,
} from 'react-native';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Plus, X, CheckCircle, Circle, Edit2, Trash2 } from 'lucide-react-native';
import colors from '@/constants/colors';
import { useApp } from '@/contexts/AppContext';
import { Task, TaskType, Priority, ReminderTime } from '@/types';
import Mascot from '@/components/Mascot';
import SearchBar from '@/components/SearchBar';
import StreakCard from '@/components/StreakCard';
import { useStreak } from '@/contexts/StreakContext';

export default function TasksScreen() {
  const { sortedTasks, addTask, updateTask, deleteTask, classes, refreshTasks } = useApp();
  const { updateStreak } = useStreak();
  const router = useRouter();
  const [showModal, setShowModal] = useState(false);
  const [showActionSheet, setShowActionSheet] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [selectedTaskForDetail, setSelectedTaskForDetail] = useState<Task | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [description, setDescription] = useState('');
  const [taskType, setTaskType] = useState<TaskType>('task');
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [dueDate, setDueDate] = useState(new Date());
  const [dueTime, setDueTime] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [priority, setPriority] = useState<Priority>('medium');
  const [reminder, setReminder] = useState<ReminderTime>('1d');
  const [customReminderDate, setCustomReminderDate] = useState(new Date());
  const [showCustomReminderPicker, setShowCustomReminderPicker] = useState(false);
  const [alarmEnabled, setAlarmEnabled] = useState(false);

  // Search and filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'active' | 'completed' | 'missed' | TaskType>('all');

  const scaleAnim = React.useRef(new Animated.Value(0)).current;
  const detailScaleAnim = React.useRef(new Animated.Value(0)).current;


  // Helper to check if a task is missed (not completed and > 10 mins past due)
  const isTaskMissed = (task: Task) => {
    if (task.completed) return false;

    // Create due date object
    const due = new Date(task.dueDate);
    if (task.dueTime) {
      const [hours, minutes] = task.dueTime.split(':');
      due.setHours(parseInt(hours), parseInt(minutes), 0, 0);
    } else {
      // Default to 9 AM logic if needed, but if no time is specified, usually implies end of day.
      // However, notification service assumes 9 AM, so let's stick to that for "missed" consistency.
      due.setHours(9, 0, 0, 0);
    }

    // Add 10 minutes grace period
    const gracePeriod = new Date(due.getTime() + 10 * 60000); // 10 minutes in ms

    return new Date() > gracePeriod;
  };

  useFocusEffect(
    useCallback(() => {
      refreshTasks();
    }, [])
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

  React.useEffect(() => {
    if (showDetailModal) {
      Animated.spring(detailScaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 50,
        friction: 7,
      }).start();
    } else {
      detailScaleAnim.setValue(0);
    }
  }, [showDetailModal, detailScaleAnim]);

  const taskTypes: TaskType[] = ['task', 'event', 'exam', 'paper', 'appointment', 'homework', 'work', 'internship'];
  const priorities: Priority[] = ['low', 'medium', 'high'];
  const reminders: ReminderTime[] = ['1h', '2h', '1d', '2d', 'custom'];

  // Filter tasks based on search and active filter
  const filteredTasks = React.useMemo(() => {
    const filtered = sortedTasks.filter(task => {
      // Search filter (always active)
      const matchesSearch = task.description.toLowerCase().includes(searchQuery.toLowerCase());

      // Single active filter
      let matchesFilter = true;
      if (activeFilter === 'active') {
        // Active tasks are incomplete AND NOT missed
        matchesFilter = !task.completed && !isTaskMissed(task);
      } else if (activeFilter === 'completed') {
        matchesFilter = task.completed;
      } else if (activeFilter === 'missed') {
        matchesFilter = isTaskMissed(task);
      } else if (activeFilter !== 'all') {
        // It's a task type filter
        matchesFilter = task.type === activeFilter;
      }

      return matchesSearch && matchesFilter;
    });

    // Sort: incomplete tasks first, then completed tasks (only for 'all' filter)
    if (activeFilter === 'all') {
      return filtered.sort((a, b) => {
        // If completion status is different, incomplete comes first
        if (a.completed !== b.completed) {
          return a.completed ? 1 : -1;
        }        // If both have same completion status, maintain original order
        return 0;
      });
    }

    return filtered;
  }, [sortedTasks, searchQuery, activeFilter]);

  const handleAddTask = () => {
    if (!description) return;

    const formattedDate = dueDate.toISOString().split('T')[0];
    const formattedTime = dueTime.toTimeString().split(' ')[0].substring(0, 5);

    if (isEditing && selectedTask) {
      // Update existing task
      updateTask(selectedTask.id, {
        description,
        type: taskType,
        className: selectedClass,
        dueDate: formattedDate,
        dueTime: formattedTime,
        priority,
        reminder,
        customReminderDate: reminder === 'custom' ? customReminderDate.toISOString() : undefined,
        alarmEnabled,
      });
    } else {
      // Create new task
      const newTask: Task = {
        id: Date.now().toString(),
        description,
        type: taskType,
        className: selectedClass,
        dueDate: formattedDate,
        dueTime: formattedTime,
        priority,
        reminder,
        customReminderDate: reminder === 'custom' ? customReminderDate.toISOString() : undefined,
        alarmEnabled,
        completed: false,
        createdAt: new Date().toISOString(),
      };
      addTask(newTask);
    }

    refreshTasks();
    resetForm();
    setShowModal(false);
    setIsEditing(false);
    setSelectedTask(null);
  };

  const resetForm = () => {
    setDescription('');
    setTaskType('task');
    setSelectedClass('');
    setDueDate(new Date());
    setDueTime(new Date());
    setPriority('medium');
    setReminder('1d');
    setCustomReminderDate(new Date());
    setAlarmEnabled(false);
  };

  const toggleTaskComplete = async (task: Task) => {
    updateTask(task.id, { completed: !task.completed });

    // Streak update is now handled automatically by the backend
    // and state updates are handled optimistically by AppContext
  };

  const handleLongPress = (task: Task) => {
    setSelectedTask(task);
    setShowActionSheet(true);
  };

  const handleEdit = (taskToEdit: Task | null = selectedTask) => {
    if (!taskToEdit) return;

    setDescription(taskToEdit.description);
    setTaskType(taskToEdit.type);
    setSelectedClass(taskToEdit.className || '');
    setDueDate(new Date(taskToEdit.dueDate));
    setDueTime(new Date(`2000-01-01 ${taskToEdit.dueTime}`));
    setPriority(taskToEdit.priority);
    setReminder(taskToEdit.reminder || '1d');
    if (taskToEdit.customReminderDate) {
      setCustomReminderDate(new Date(taskToEdit.customReminderDate));
    }
    setAlarmEnabled(taskToEdit.alarmEnabled);
    setIsEditing(true);
    setShowActionSheet(false);
    setShowModal(true);
  };

  const handleDelete = () => {
    if (!selectedTask) return;

    Alert.alert(
      'Delete Task',
      'Are you sure you want to delete this task?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            deleteTask(selectedTask.id);
            refreshTasks();
            setShowActionSheet(false);
            setSelectedTask(null);
          },
        },
      ]
    );
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

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

  const handleTaskPress = (task: Task) => {
    // Allow opening modal for all tasks (including completed ones)
    setSelectedTaskForDetail(task);
    setShowDetailModal(true);
  };

  const handleEditFromDetail = () => {
    if (!selectedTaskForDetail) return;
    setSelectedTask(selectedTaskForDetail); // Set selectedTask for context
    setShowDetailModal(false);
    handleEdit(selectedTaskForDetail);
  };

  const handleDeleteFromDetail = () => {
    if (!selectedTaskForDetail) return;
    Alert.alert(
      'Delete Task',
      'Are you sure you want to delete this task?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            deleteTask(selectedTaskForDetail.id);
            setShowDetailModal(false);
            setSelectedTaskForDetail(null);
          },
        },
      ]
    );
  };

  const renderTaskItem = ({ item: task }: { item: Task }) => {
    const missed = isTaskMissed(task);

    return (
      <Pressable
        style={[
          styles.taskCard,
          task.completed && styles.taskCardCompleted,
          missed && { borderColor: '#FECACA', borderWidth: 1 } // Red border for missed
        ]}
        onPress={() => handleTaskPress(task)}
        onLongPress={() => handleLongPress(task)}
      >
        <View style={styles.taskLeft}>
          <TouchableOpacity
            onPress={() => toggleTaskComplete(task)}
            style={[styles.taskIcon, { backgroundColor: colors.taskColors[task.type] }]}
            activeOpacity={0.7}
          >
            {task.completed ? (
              <CheckCircle size={24} color={colors.surface} />
            ) : (
              <Circle size={24} color={colors.surface} />
            )}
          </TouchableOpacity>
          <View style={styles.taskContent}>
            <Text style={[styles.taskTitle, task.completed && styles.taskTitleCompleted]}>
              {task.description}
            </Text>
            <View style={styles.taskMeta}>
              <View style={[styles.typeBadge, { backgroundColor: colors.taskColors[task.type] + '20' }]}>
                <Text style={[styles.typeBadgeText, { color: colors.taskColors[task.type] }]}>
                  {task.type}
                </Text>
              </View>
              {missed && (
                <View style={[styles.typeBadge, { backgroundColor: '#FEE2E2', marginLeft: 6 }]}>
                  <Text style={[styles.typeBadgeText, { color: '#EF4444' }]}>
                    Missed
                  </Text>
                </View>
              )}
              {task.className && (
                <Text style={styles.taskClass}>{task.className}</Text>
              )}
            </View>
            <Text style={[styles.taskDate, missed && { color: '#EF4444' }]}>
              {getDaysUntil(task.dueDate)} • {formatDate(task.dueDate)}
              {task.dueTime && ` at ${task.dueTime}`}
            </Text>
          </View>
        </View>
        <View style={[styles.priorityDot, { backgroundColor: colors.priorityColors[task.priority] }]} />
      </Pressable>
    );
  };
  // Pull-to-refresh handler
  const onRefresh = async () => {
    setRefreshing(true);
    await refreshTasks();
    setRefreshing(false);
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <FlatList
        data={filteredTasks}
        renderItem={renderTaskItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.taskListContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
        ListHeaderComponent={
          <>
            <View style={styles.header}>
              <View>
                <Text style={styles.title}>🚀 Don't let deadlines sneak up on you!</Text>
                <Text style={styles.subtitle}>You have {filteredTasks.filter(t => !t.completed).length} tasks pending</Text>
              </View>
              <TouchableOpacity style={styles.addButton} onPress={() => setShowModal(true)}>
                <Plus size={24} color={colors.surface} />
              </TouchableOpacity>
            </View>
            <StreakCard />

            <View style={styles.searchContainer}>
              <SearchBar
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Search tasks..."
              />
            </View>

            <View style={styles.filtersContainer}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filtersScroll}>
                <TouchableOpacity
                  style={[styles.filterChip, activeFilter === 'all' && styles.filterChipActive]}
                  onPress={() => setActiveFilter('all')}
                >
                  <Text style={[styles.filterChipText, activeFilter === 'all' && styles.filterChipTextActive]}>All</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.filterChip, activeFilter === 'active' && styles.filterChipActive]}
                  onPress={() => setActiveFilter('active')}
                >
                  <Text style={[styles.filterChipText, activeFilter === 'active' && styles.filterChipTextActive]}>Active</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.filterChip, activeFilter === 'missed' && styles.filterChipActive]}
                  onPress={() => setActiveFilter('missed')}
                >
                  <Text style={[styles.filterChipText, activeFilter === 'missed' && styles.filterChipTextActive]}>Missed</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.filterChip, activeFilter === 'completed' && styles.filterChipActive]}
                  onPress={() => setActiveFilter('completed')}
                >
                  <Text style={[styles.filterChipText, activeFilter === 'completed' && styles.filterChipTextActive]}>Completed</Text>
                </TouchableOpacity>
                <View style={styles.filterDivider} />
                {taskTypes.map((type) => (
                  <TouchableOpacity
                    key={type}
                    style={[styles.filterChip, activeFilter === type && styles.filterChipActive]}
                    onPress={() => setActiveFilter(type)}
                  >
                    <Text style={[styles.filterChipText, activeFilter === type && styles.filterChipTextActive]}>
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </>
        }
        ListEmptyComponent={() => (
          <View style={styles.emptyState}>
            <Mascot size={80} />
            <Text style={styles.emptyText}>
              {searchQuery || activeFilter !== 'all'
                ? 'No tasks match your filters'
                : 'No tasks yet'}
            </Text>
            <Text style={styles.emptySubtext}>
              {searchQuery || activeFilter !== 'all'
                ? 'Try adjusting your search or filters'
                : 'Tap the + button to create your first task'}
            </Text>
          </View>
        )}
        showsVerticalScrollIndicator={false}
      />

      <Modal visible={showModal} transparent animationType="fade" onRequestClose={() => setShowModal(false)}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardAvoidingView}
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
                  <Text style={styles.modalTitle}>{isEditing ? 'Edit Task' : 'Create Task'}</Text>
                  <TouchableOpacity onPress={() => {
                    setShowModal(false);
                    setIsEditing(false);
                    setSelectedTask(null);
                    resetForm();
                  }}>
                    <X size={24} color={colors.text} />
                  </TouchableOpacity>
                </View>

                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.modalScrollContent} keyboardShouldPersistTaps="handled">
                  <Text style={styles.label}>Description *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Enter task description"
                    placeholderTextColor={colors.textLight}
                    value={description}
                    onChangeText={setDescription}
                  />

                  <Text style={styles.label}>Type *</Text>
                  <View style={styles.optionGrid}>
                    {taskTypes.map((type) => (
                      <TouchableOpacity
                        key={type}
                        style={[
                          styles.optionChip,
                          taskType === type && { backgroundColor: colors.taskColors[type] },
                        ]}
                        onPress={() => setTaskType(type)}
                      >
                        <Text
                          style={[
                            styles.optionChipText,
                            taskType === type && { color: colors.surface },
                          ]}
                        >
                          {type}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  <Text style={styles.label}>Class</Text>
                  <TouchableOpacity
                    onPress={() => {
                      setShowModal(false);
                      router.push('/(tabs)/classes');
                    }}
                    style={styles.helperNote}
                  >
                    <Text style={styles.helperNoteText}>
                      Don't see your class? Click{' '}
                      <Text style={styles.helperNoteLink}>HERE</Text>
                      {' '}to create a class.
                    </Text>
                  </TouchableOpacity>
                  <View style={styles.optionGrid}>
                    <TouchableOpacity
                      style={[
                        styles.optionChip,
                        !selectedClass && { backgroundColor: colors.primary },
                      ]}
                      onPress={() => setSelectedClass('')}
                    >
                      <Text
                        style={[
                          styles.optionChipText,
                          !selectedClass && { color: colors.surface },
                        ]}
                      >
                        None
                      </Text>
                    </TouchableOpacity>
                    {classes.map((cls) => (
                      <TouchableOpacity
                        key={cls.id}
                        style={[
                          styles.optionChip,
                          selectedClass === cls.name && { backgroundColor: cls.color },
                        ]}
                        onPress={() => setSelectedClass(cls.name)}
                      >
                        <Text
                          style={[
                            styles.optionChipText,
                            selectedClass === cls.name && { color: colors.surface },
                          ]}
                        >
                          {cls.name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  <Text style={styles.label}>Due Date *</Text>
                  <TouchableOpacity
                    style={styles.input}
                    onPress={() => setShowDatePicker(true)}
                  >
                    <Text style={styles.inputText}>
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
                    <Text style={styles.inputText}>
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

                  <Text style={styles.label}>Priority</Text>
                  <View style={styles.optionGrid}>
                    {priorities.map((p) => (
                      <TouchableOpacity
                        key={p}
                        style={[
                          styles.optionChip,
                          priority === p && { backgroundColor: colors.priorityColors[p] },
                        ]}
                        onPress={() => setPriority(p)}
                      >
                        <Text
                          style={[
                            styles.optionChipText,
                            priority === p && { color: colors.surface },
                          ]}
                        >
                          {p}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  <Text style={styles.label}>Reminder</Text>
                  <View style={styles.optionGrid}>
                    {reminders.map((r) => (
                      <TouchableOpacity
                        key={r}
                        style={[
                          styles.optionChip,
                          reminder === r && { backgroundColor: colors.primary },
                        ]}
                        onPress={() => {
                          setReminder(r);
                          if (r === 'custom') {
                            // Set minimum date to current time + 1 minute
                            const minDate = new Date();
                            minDate.setMinutes(minDate.getMinutes() + 1);
                            setCustomReminderDate(minDate);
                            setShowCustomReminderPicker(true);
                          }
                        }}
                      >
                        <Text
                          style={[
                            styles.optionChipText,
                            reminder === r && { color: colors.surface },
                          ]}
                        >
                          {r}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  {reminder === 'custom' && (
                    <TouchableOpacity
                      style={[styles.input, { marginTop: 8 }]}
                      onPress={() => setShowCustomReminderPicker(true)}
                    >
                      <Text style={styles.inputText}>
                        {customReminderDate.toLocaleString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </Text>
                    </TouchableOpacity>
                  )}
                  <DateTimePickerModal
                    isVisible={showCustomReminderPicker}
                    mode="datetime"
                    date={customReminderDate}
                    minimumDate={new Date()}
                    onConfirm={(date) => {
                      if (date > new Date()) {
                        setShowCustomReminderPicker(false);
                        setCustomReminderDate(date);
                      } else {
                        setShowCustomReminderPicker(false);
                        Alert.alert(
                          'Invalid Date',
                          'Reminder must be set for a future date and time.',
                          [{ text: 'OK' }]
                        );
                      }
                    }}
                    onCancel={() => setShowCustomReminderPicker(false)}
                  />

                  <TouchableOpacity
                    style={[styles.checkboxRow, alarmEnabled && styles.checkboxRowActive]}
                    onPress={() => setAlarmEnabled(!alarmEnabled)}
                  >
                    <View style={[styles.checkbox, alarmEnabled && styles.checkboxChecked]}>
                      {alarmEnabled && <CheckCircle size={20} color={colors.surface} />}
                    </View>
                    <Text style={styles.checkboxLabel}>Enable alarm sound</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.createButton, !description && styles.createButtonDisabled]}
                    onPress={handleAddTask}
                    disabled={!description}
                  >
                    <Text style={styles.createButtonText}>{isEditing ? 'Update Task' : 'Create Task'}</Text>
                  </TouchableOpacity>
                </ScrollView>
              </Animated.View>
            </TouchableOpacity>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </Modal>

      {/* Action Sheet Modal */}

      {/* Task Detail Modal */}
      <Modal
        visible={showDetailModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDetailModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowDetailModal(false)}
        >
          <TouchableOpacity
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
            style={{ width: '100%', alignItems: 'center' }}
          >
            <Animated.View style={[styles.modalContent, { transform: [{ scale: detailScaleAnim }] }]}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Task Details</Text>
                <TouchableOpacity onPress={() => setShowDetailModal(false)}>
                  <X size={24} color={colors.text} />
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.modalScrollContent}>
                {/* Task Description */}
                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Description</Text>
                  <Text style={styles.detailValue}>{selectedTaskForDetail?.description}</Text>
                </View>

                {/* Type */}
                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Type</Text>
                  <View style={[styles.typeBadge, { backgroundColor: selectedTaskForDetail ? colors.taskColors[selectedTaskForDetail.type] + '20' : colors.background }]}>
                    <Text style={[styles.typeBadgeText, { color: selectedTaskForDetail ? colors.taskColors[selectedTaskForDetail.type] : colors.text }]}>
                      {selectedTaskForDetail?.type}
                    </Text>
                  </View>
                </View>

                {/* Class */}
                {selectedTaskForDetail?.className && (
                  <View style={styles.detailSection}>
                    <Text style={styles.detailLabel}>Class</Text>
                    <Text style={styles.detailValue}>{selectedTaskForDetail.className}</Text>
                  </View>
                )}

                {/* Due Date & Time */}
                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Due Date</Text>
                  <Text style={styles.detailValue}>
                    {selectedTaskForDetail && formatDate(selectedTaskForDetail.dueDate)}
                    {selectedTaskForDetail?.dueTime && ` at ${selectedTaskForDetail.dueTime}`}
                  </Text>
                </View>

                {/* Priority */}
                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Priority</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <View style={[styles.priorityDot, { backgroundColor: selectedTaskForDetail ? colors.priorityColors[selectedTaskForDetail.priority] : colors.background }]} />
                    <Text style={[styles.detailValue, { textTransform: 'capitalize' }]}>
                      {selectedTaskForDetail?.priority}
                    </Text>
                  </View>
                </View>

                {/* Reminder */}
                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Reminder</Text>
                  <Text style={styles.detailValue}>
                    {selectedTaskForDetail?.reminder === '1h' && '1 hour before'}
                    {selectedTaskForDetail?.reminder === '2h' && '2 hours before'}
                    {selectedTaskForDetail?.reminder === '1d' && '1 day before'}
                    {selectedTaskForDetail?.reminder === '2d' && '2 days before'}
                    {selectedTaskForDetail?.reminder === 'custom' && 'Custom reminder'}
                  </Text>
                </View>

                {/* Alarm */}
                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Alarm</Text>
                  <Text style={styles.detailValue}>
                    {selectedTaskForDetail?.alarmEnabled ? 'Enabled' : 'Disabled'}
                  </Text>
                </View>

                {/* Status */}
                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Status</Text>
                  <Text style={[styles.detailValue, { color: selectedTaskForDetail?.completed ? colors.success : colors.textSecondary }]}>
                    {selectedTaskForDetail?.completed ? 'Completed' : 'Pending'}
                  </Text>
                </View>
              </ScrollView>

              {/* Action Buttons */}
              <View style={styles.detailActions}>
                <TouchableOpacity
                  style={[styles.detailButton, styles.toggleButton]}
                  onPress={() => {
                    if (selectedTaskForDetail) {
                      toggleTaskComplete(selectedTaskForDetail);
                      setShowDetailModal(false);
                    }
                  }}
                >
                  <Text style={styles.detailButtonText}>
                    Mark as {selectedTaskForDetail?.completed ? 'Incomplete' : 'Complete'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.detailButton, styles.editButton]}
                  onPress={handleEditFromDetail}
                >
                  <Edit2 size={18} color={colors.surface} />
                  <Text style={styles.detailButtonText}>Edit</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.detailButton, styles.deleteButton]}
                  onPress={handleDeleteFromDetail}
                >
                  <Trash2 size={18} color={colors.surface} />
                  <Text style={styles.detailButtonText}>Delete</Text>
                </TouchableOpacity>
              </View>
            </Animated.View>
          </TouchableOpacity>
        </TouchableOpacity>
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
            <TouchableOpacity style={styles.actionButton} onPress={() => handleEdit()}>
              <Edit2 size={20} color={colors.primary} />
              <Text style={styles.actionButtonText}>Edit Task</Text>
            </TouchableOpacity>
            <View style={styles.actionDivider} />
            <TouchableOpacity style={styles.actionButton} onPress={handleDelete}>
              <Trash2 size={20} color="#FF3B30" />
              <Text style={[styles.actionButtonText, { color: '#FF3B30' }]}>Delete Task</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView >
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    justifyContent: 'space-between',
    // paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
  },
  title: {
    fontSize: 32,
    fontWeight: '800' as const,
    color: colors.text,
    marginBottom: 16,
    alignSelf: "center"
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
    alignSelf: "flex-end"
  },
  scrollView: {
    flex: 1,
  },
  taskListContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  footerLoader: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  footerText: {
    marginTop: 8,
    fontSize: 14,
    color: colors.textSecondary,
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
  },
  emptySubtext: {
    fontSize: 14,
    color: colors.textLight,
    marginTop: 8,
  },
  taskList: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  taskCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: colors.cardShadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  taskCardCompleted: {
    opacity: 0.6,
  },
  taskLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  taskIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  taskContent: {
    flex: 1,
  },
  taskTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: colors.text,
    marginBottom: 6,
  },
  taskTitleCompleted: {
    textDecorationLine: 'line-through',
    color: colors.textSecondary,
  },
  taskMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginRight: 8,
  },
  typeBadgeText: {
    fontSize: 11,
    fontWeight: '600' as const,
    textTransform: 'capitalize',
  },
  taskClass: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  taskDate: {
    fontSize: 12,
    color: colors.textLight,
  },
  priorityDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginLeft: 12,
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
  inputText: {
    fontSize: 16,
    color: colors.text,
  },
  optionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  optionChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  optionChipText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: colors.text,
    textTransform: 'capitalize',
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    marginTop: 16,
  },
  checkboxRowActive: {
    opacity: 1,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.border,
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  checkboxLabel: {
    fontSize: 14,
    color: colors.text,
    fontWeight: '500' as const,
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
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 40,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    gap: 12,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: colors.text,
  },
  actionDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginHorizontal: 20,
  },
  searchContainer: {
    paddingBottom: 12,
  },
  filtersContainer: {
    paddingBottom: 12,
  },
  filtersScroll: {
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterChipText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: colors.text,
  },
  filterChipTextActive: {
    color: colors.surface,
  },
  filterDivider: {
    width: 1,
    height: 24,
    backgroundColor: colors.border,
    marginHorizontal: 4,
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  helperNote: {
    marginBottom: 8,
    paddingVertical: 6,
  },
  helperNoteText: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  helperNoteLink: {
    color: colors.primary,
    fontWeight: '600' as const,
    textDecorationLine: 'underline',
  },
  modalScrollContent: {
    paddingBottom: 20,
  },
  detailSection: {
    marginBottom: 20,
  },
  detailLabel: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: colors.textSecondary,
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  detailValue: {
    fontSize: 16,
    color: colors.text,
    lineHeight: 24,
  },
  detailActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  detailButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  toggleButton: {
    backgroundColor: colors.primary,
  },
  editButton: {
    backgroundColor: colors.primary,
  },
  deleteButton: {
    backgroundColor: colors.error || '#ef4444',
  },
  detailButtonText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: colors.surface,
  },
});
