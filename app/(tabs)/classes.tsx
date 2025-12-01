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
import { Plus, X, BookOpen, Clock, User, Calendar as CalendarIcon } from 'lucide-react-native';
import colors from '@/constants/colors';
import { useApp } from '@/contexts/AppContext';
import { Class } from '@/types';

const CLASS_COLORS = [colors.primary, colors.secondary, colors.success, colors.warning, '#56CCF2', '#F2994A'];
const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export default function ClassesScreen() {
  const { classes, addClass, deleteClass } = useApp();
  const [showClassModal, setShowClassModal] = useState(false);

  const [name, setName] = useState('');
  const [section, setSection] = useState('');
  const [selectedDays, setSelectedDays] = useState<string[]>([]);
  const [time, setTime] = useState('');
  const [professor, setProfessor] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedColor, setSelectedColor] = useState(CLASS_COLORS[0]);

  const scaleAnim = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    if (showClassModal) {
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 50,
        friction: 7,
      }).start();
    } else {
      scaleAnim.setValue(0);
    }
  }, [showClassModal, scaleAnim]);

  const toggleDay = (day: string) => {
    setSelectedDays(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    );
  };

  const handleAddClass = () => {
    if (!name || selectedDays.length === 0 || !time || !startDate || !endDate) return;

    const newClass: Class = {
      id: Date.now().toString(),
      name,
      section,
      daysOfWeek: selectedDays,
      time,
      professor,
      startDate,
      endDate,
      color: selectedColor,
      createdAt: new Date().toISOString(),
    };

    addClass(newClass);
    resetClassForm();
    setShowClassModal(false);
  };

  const resetClassForm = () => {
    setName('');
    setSection('');
    setSelectedDays([]);
    setTime('');
    setProfessor('');
    setStartDate('');
    setEndDate('');
    setSelectedColor(CLASS_COLORS[0]);
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Classes</Text>
          <Text style={styles.subtitle}>Manage your classes</Text>
        </View>
      </View>

      <View style={styles.actionButtons}>
        <TouchableOpacity style={styles.primaryButton} onPress={() => setShowClassModal(true)}>
          <Plus size={20} color={colors.surface} />
          <Text style={styles.primaryButtonText}>Add Class</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {classes.length === 0 ? (
          <View style={styles.emptyState}>
            <BookOpen size={64} color={colors.textLight} />
            <Text style={styles.emptyText}>No classes yet</Text>
            <Text style={styles.emptySubtext}>Add your classes to get started</Text>
          </View>
        ) : (
          <View style={styles.classList}>
            {classes.map((cls) => (
              <TouchableOpacity
                key={cls.id}
                style={[styles.classCard, { borderLeftColor: cls.color }]}
                onLongPress={() => deleteClass(cls.id)}
              >
                <View style={[styles.classIconContainer, { backgroundColor: cls.color + '20' }]}>
                  <BookOpen size={28} color={cls.color} />
                </View>
                <View style={styles.classContent}>
                  <Text style={styles.className}>{cls.name}</Text>
                  {cls.section && (
                    <Text style={styles.classSection}>{cls.section}</Text>
                  )}
                  <View style={styles.classMetaRow}>
                    <Clock size={14} color={colors.textSecondary} />
                    <Text style={styles.classMetaText}>{cls.time}</Text>
                  </View>
                  <View style={styles.classMetaRow}>
                    <CalendarIcon size={14} color={colors.textSecondary} />
                    <Text style={styles.classMetaText}>{cls.daysOfWeek.join(', ')}</Text>
                  </View>
                  {cls.professor && (
                    <View style={styles.classMetaRow}>
                      <User size={14} color={colors.textSecondary} />
                      <Text style={styles.classMetaText}>{cls.professor}</Text>
                    </View>
                  )}
                  <Text style={styles.classDates}>
                    {new Date(cls.startDate).toLocaleDateString()} - {new Date(cls.endDate).toLocaleDateString()}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>

      <Modal visible={showClassModal} transparent animationType="fade" onRequestClose={() => setShowClassModal(false)}>
        <View style={styles.modalOverlay}>
          <Animated.View style={[styles.modalContent, { transform: [{ scale: scaleAnim }] }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Class</Text>
              <TouchableOpacity onPress={() => setShowClassModal(false)}>
                <X size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.label}>Class Name *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., Introduction to Psychology"
                placeholderTextColor={colors.textLight}
                value={name}
                onChangeText={setName}
              />

              <Text style={styles.label}>Section</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., Section A"
                placeholderTextColor={colors.textLight}
                value={section}
                onChangeText={setSection}
              />

              <Text style={styles.label}>Days of Week *</Text>
              <View style={styles.daysGrid}>
                {DAYS_OF_WEEK.map((day) => (
                  <TouchableOpacity
                    key={day}
                    style={[
                      styles.dayChip,
                      selectedDays.includes(day) && { backgroundColor: colors.primary, borderColor: colors.primary },
                    ]}
                    onPress={() => toggleDay(day)}
                  >
                    <Text
                      style={[
                        styles.dayChipText,
                        selectedDays.includes(day) && { color: colors.surface },
                      ]}
                    >
                      {day.slice(0, 3)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.label}>Time *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., 09:00 AM - 10:30 AM"
                placeholderTextColor={colors.textLight}
                value={time}
                onChangeText={setTime}
              />

              <Text style={styles.label}>Professor</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., Dr. Smith"
                placeholderTextColor={colors.textLight}
                value={professor}
                onChangeText={setProfessor}
              />

              <Text style={styles.label}>Start Date *</Text>
              <TextInput
                style={styles.input}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={colors.textLight}
                value={startDate}
                onChangeText={setStartDate}
              />

              <Text style={styles.label}>End Date *</Text>
              <TextInput
                style={styles.input}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={colors.textLight}
                value={endDate}
                onChangeText={setEndDate}
              />

              <Text style={styles.label}>Color</Text>
              <View style={styles.colorGrid}>
                {CLASS_COLORS.map((color) => (
                  <TouchableOpacity
                    key={color}
                    style={[
                      styles.colorOption,
                      { backgroundColor: color },
                      selectedColor === color && styles.colorOptionSelected,
                    ]}
                    onPress={() => setSelectedColor(color)}
                  />
                ))}
              </View>

              <TouchableOpacity
                style={[
                  styles.createButton,
                  (!name || selectedDays.length === 0 || !time || !startDate || !endDate) && styles.createButtonDisabled
                ]}
                onPress={handleAddClass}
                disabled={!name || selectedDays.length === 0 || !time || !startDate || !endDate}
              >
                <Text style={styles.createButtonText}>Add Class</Text>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: '800' as const,
    color: colors.text,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 4,
  },
  actionButtons: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 16,
    gap: 12,
  },
  primaryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: colors.primary,
    gap: 8,
  },
  primaryButtonText: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: colors.surface,
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
  classList: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  classCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    borderLeftWidth: 6,
    shadowColor: colors.cardShadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  classIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  classContent: {
    flex: 1,
  },
  className: {
    fontSize: 17,
    fontWeight: '700' as const,
    color: colors.text,
    marginBottom: 4,
  },
  classSection: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  classMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  classMetaText: {
    fontSize: 13,
    color: colors.textSecondary,
    marginLeft: 6,
  },
  classDates: {
    fontSize: 12,
    color: colors.textLight,
    marginTop: 8,
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
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  dayChip: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: colors.background,
    borderWidth: 2,
    borderColor: colors.border,
  },
  dayChipText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: colors.text,
  },
  colorGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  colorOption: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 3,
    borderColor: 'transparent',
  },
  colorOptionSelected: {
    borderColor: colors.text,
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
