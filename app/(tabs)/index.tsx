import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Plus, X, CheckCircle, Circle } from 'lucide-react-native';
import colors from '@/constants/colors';
import { useApp } from '@/contexts/AppContext';
import { Task, TaskType, Priority, ReminderTime } from '@/types';
import Mascot from '@/components/Mascot';
import LogoButton from '@/components/LogoButton';



export default function TasksScreen() {
  const { sortedTasks, addTask, updateTask, deleteTask, classes } = useApp();
  const [showModal, setShowModal] = useState(false);
  const [description, setDescription] = useState('');
  const [taskType, setTaskType] = useState<TaskType>('task');
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [dueDate, setDueDate] = useState('');
  const [dueTime, setDueTime] = useState('');
  const [priority, setPriority] = useState<Priority>('medium');
  const [reminder, setReminder] = useState<ReminderTime>('1d');
  const [alarmEnabled, setAlarmEnabled] = useState(false);

  const scaleAnim = React.useRef(new Animated.Value(0)).current;

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

  const taskTypes: TaskType[] = ['task', 'event', 'exam', 'paper', 'appointment', 'homework'];
  const priorities: Priority[] = ['low', 'medium', 'high'];
  const reminders: ReminderTime[] = ['1h', '2h', '1d', '2d', 'custom'];

  const handleAddTask = () => {
    if (!description || !dueDate) return;

    const newTask: Task = {
      id: Date.now().toString(),
      description,
      type: taskType,
      className: selectedClass,
      dueDate,
      dueTime,
      priority,
      reminder,
      alarmEnabled,
      completed: false,
      createdAt: new Date().toISOString(),
    };

    addTask(newTask);
    resetForm();
    setShowModal(false);
  };

  const resetForm = () => {
    setDescription('');
    setTaskType('task');
    setSelectedClass('');
    setDueDate('');
    setDueTime('');
    setPriority('medium');
    setReminder('1d');
    setAlarmEnabled(false);
  };

  const toggleTaskComplete = (task: Task) => {
    updateTask(task.id, { completed: !task.completed });
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

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.logoContainer}>
        <LogoButton size={44} />
      </View>

      <View style={styles.heroSection}>
        <Text style={styles.appTitle}>Cause Student AI Planner</Text>
        <Text style={styles.heroSubtitle}>Making a difference, one task at a time</Text>
      </View>

      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Upcoming Tasks</Text>
          <Text style={styles.subtitle}>You have {sortedTasks.filter(t => !t.completed).length} tasks pending</Text>
        </View>
        <TouchableOpacity style={styles.addButton} onPress={() => setShowModal(true)}>
          <Plus size={24} color={colors.surface} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {sortedTasks.length === 0 ? (
          <View style={styles.emptyState}>
            <Mascot size={80} />
            <Text style={styles.emptyText}>No tasks yet</Text>
            <Text style={styles.emptySubtext}>Tap the + button to create your first task</Text>
          </View>
        ) : (
          <View style={styles.taskList}>
            {sortedTasks.map((task) => (
              <TouchableOpacity
                key={task.id}
                style={[
                  styles.taskCard,
                  task.completed && styles.taskCardCompleted,
                ]}
                onPress={() => toggleTaskComplete(task)}
                onLongPress={() => deleteTask(task.id)}
              >
                <View style={styles.taskLeft}>
                  <View style={[styles.taskIcon, { backgroundColor: colors.taskColors[task.type] }]}>
                    {task.completed ? (
                      <CheckCircle size={24} color={colors.surface} />
                    ) : (
                      <Circle size={24} color={colors.surface} />
                    )}
                  </View>
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
                      {task.className && (
                        <Text style={styles.taskClass}>{task.className}</Text>
                      )}
                    </View>
                    <Text style={styles.taskDate}>
                      {getDaysUntil(task.dueDate)} • {formatDate(task.dueDate)}
                      {task.dueTime && ` at ${task.dueTime}`}
                    </Text>
                  </View>
                </View>
                <View style={[styles.priorityDot, { backgroundColor: colors.priorityColors[task.priority] }]} />
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>

      <Modal visible={showModal} transparent animationType="fade" onRequestClose={() => setShowModal(false)}>
        <View style={styles.modalOverlay}>
          <Animated.View style={[styles.modalContent, { transform: [{ scale: scaleAnim }] }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Create Task</Text>
              <TouchableOpacity onPress={() => setShowModal(false)}>
                <X size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
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
              <TextInput
                style={styles.input}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={colors.textLight}
                value={dueDate}
                onChangeText={setDueDate}
              />

              <Text style={styles.label}>Due Time</Text>
              <TextInput
                style={styles.input}
                placeholder="HH:MM"
                placeholderTextColor={colors.textLight}
                value={dueTime}
                onChangeText={setDueTime}
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
                    onPress={() => setReminder(r)}
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
                style={[styles.createButton, (!description || !dueDate) && styles.createButtonDisabled]}
                onPress={handleAddTask}
                disabled={!description || !dueDate}
              >
                <Text style={styles.createButtonText}>Create Task</Text>
              </TouchableOpacity>
            </ScrollView>
          </Animated.View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  logoContainer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
  },
  heroSection: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 8,
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
});
