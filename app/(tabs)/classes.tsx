import React, { useState, useRef, useEffect } from 'react';
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
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Plus, X, BookOpen, Clock, User, Calendar as CalendarIcon, Edit2, Trash2 } from 'lucide-react-native';
import colors from '@/constants/colors';
import { useApp } from '@/contexts/AppContext';
import { Class } from '@/types';
import SearchBar from '@/components/SearchBar';

const CLASS_COLORS = [colors.primary, colors.secondary, colors.success, colors.warning, '#56CCF2', '#F2994A'];
const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

// Convert JS date → 12-hour string
const formatTime12H = (date: Date): string => {
  let hours = date.getHours();
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12 || 12; // Convert 0 → 12
  return `${hours}:${minutes} ${ampm}`;
};

export default function ClassesScreen() {
  const { classes, addClass, updateClass, deleteClass } = useApp();

  const [showClassModal, setShowClassModal] = useState(false);
  const [showActionSheet, setShowActionSheet] = useState(false);
  const [selectedClass, setSelectedClass] = useState<Class | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  const [name, setName] = useState('');
  const [section, setSection] = useState('');
  const [selectedDays, setSelectedDays] = useState<string[]>([]);
  const [professor, setProfessor] = useState('');

  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());

  const [startTime, setStartTime] = useState(new Date());
  const [endTime, setEndTime] = useState(new Date());

  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);

  const [showStartTimePicker, setShowStartTimePicker] = useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);

  const [selectedColor, setSelectedColor] = useState(CLASS_COLORS[0]);
  const [searchQuery, setSearchQuery] = useState('');

  const scaleAnim = useRef(new Animated.Value(0)).current;

  // Filter classes based on search query
  const filteredClasses = React.useMemo(() => {
    if (!searchQuery) return classes;
    return classes.filter(cls =>
      cls.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      cls.section?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      cls.professor?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [classes, searchQuery]);

  useEffect(() => {
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
  }, [showClassModal]);

  const toggleDay = (day: string) => {
    setSelectedDays(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    );
  };

  const resetClassForm = () => {
    setName('');
    setSection('');
    setSelectedDays([]);
    setProfessor('');
    setStartDate(new Date());
    setEndDate(new Date());
    setStartTime(new Date());
    setEndTime(new Date());
    setSelectedColor(CLASS_COLORS[0]);
  };

  const handleAddClass = () => {
    if (!name.trim()) {
      Alert.alert('Required Field', 'Please enter a name for the class.');
      return;
    }

    if (selectedDays.length === 0) {
      Alert.alert('Required Field', 'Please select at least one day.');
      return;
    }

    // section is optional, so no check for it.
    // Times and Dates default to values, so they are always present.

    const formattedStartDate = startDate.toISOString().split('T')[0];
    const formattedEndDate = endDate.toISOString().split('T')[0];

    const timeString = `${formatTime12H(startTime)} - ${formatTime12H(endTime)}`;

    if (isEditing && selectedClass) {
      // Update existing class
      updateClass(selectedClass.id, {
        name,
        section,
        daysOfWeek: selectedDays,
        time: timeString,
        professor,
        startDate: formattedStartDate,
        endDate: formattedEndDate,
        color: selectedColor,
      });
    } else {
      // Create new class
      const newClass: Class = {
        id: Date.now().toString(),
        name,
        section,
        daysOfWeek: selectedDays,
        time: timeString,
        professor,
        startDate: formattedStartDate,
        endDate: formattedEndDate,
        color: selectedColor,
        createdAt: new Date().toISOString(),
      };
      addClass(newClass);
    }

    resetClassForm();
    setShowClassModal(false);
    setIsEditing(false);
    setSelectedClass(null);
  };

  const handleLongPress = (cls: Class) => {
    setSelectedClass(cls);
    setShowActionSheet(true);
  };

  const handleEdit = () => {
    if (!selectedClass) return;

    // Parse time string "HH:MM AM/PM - HH:MM AM/PM"
    const [startTimeStr] = selectedClass.time.split(' - ');
    const startTimeDate = new Date(`2000-01-01 ${startTimeStr}`);
    const endTimeStr = selectedClass.time.split(' - ')[1];
    const endTimeDate = new Date(`2000-01-01 ${endTimeStr}`);

    setName(selectedClass.name);
    setSection(selectedClass.section || '');
    setSelectedDays(selectedClass.daysOfWeek);
    setProfessor(selectedClass.professor || '');
    setStartDate(new Date(selectedClass.startDate));
    setEndDate(new Date(selectedClass.endDate));
    setStartTime(startTimeDate);
    setEndTime(endTimeDate);
    setSelectedColor(selectedClass.color);
    setIsEditing(true);
    setShowActionSheet(false);
    setShowClassModal(true);
  };

  const handleDelete = () => {
    if (!selectedClass) return;

    Alert.alert(
      'Delete Class',
      'Are you sure you want to delete this class?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            deleteClass(selectedClass.id);
            setShowActionSheet(false);
            setSelectedClass(null);
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Classes</Text>
          <Text style={styles.subtitle}>Manage your classes</Text>
        </View>
        <TouchableOpacity style={styles.addButton} onPress={() => setShowClassModal(true)}>
          <Plus size={24} color={colors.surface} />
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <SearchBar
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search classes..."
        />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {filteredClasses.length === 0 ? (
          <View style={styles.emptyState}>
            <BookOpen size={64} color={colors.textLight} />
            <Text style={styles.emptyText}>
              {searchQuery ? 'No classes match your search' : 'No classes yet'}
            </Text>
            <Text style={styles.emptySubtext}>
              {searchQuery ? 'Try a different search term' : 'Add your classes to get started'}
            </Text>
          </View>
        ) : (
          <View style={styles.classList}>
            {filteredClasses.map((cls) => (
              <TouchableOpacity
                key={cls.id}
                style={[styles.classCard, { borderLeftColor: cls.color }]}
                onLongPress={() => handleLongPress(cls)}
              >
                <View style={[styles.classIconContainer, { backgroundColor: cls.color + '20' }]}>
                  <BookOpen size={28} color={cls.color} />
                </View>
                <View style={styles.classContent}>
                  <Text style={styles.className}>{cls.name}</Text>

                  {cls.section ? <Text style={styles.classSection}>{cls.section}</Text> : null}

                  <View style={styles.classMetaRow}>
                    <Clock size={14} color={colors.textSecondary} />
                    <Text style={styles.classMetaText}>{cls.time}</Text>
                  </View>

                  <View style={styles.classMetaRow}>
                    <CalendarIcon size={14} color={colors.textSecondary} />
                    <Text style={styles.classMetaText}>{cls.daysOfWeek.join(', ')}</Text>
                  </View>

                  {cls.professor ? (
                    <View style={styles.classMetaRow}>
                      <User size={14} color={colors.textSecondary} />
                      <Text style={styles.classMetaText}>{cls.professor}</Text>
                    </View>
                  ) : null}

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
              <Text style={styles.modalTitle}>{isEditing ? 'Edit Class' : 'Add Class'}</Text>
              <TouchableOpacity onPress={() => {
                setShowClassModal(false);
                setIsEditing(false);
                setSelectedClass(null);
                resetClassForm();
              }}>
                <X size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* CLASS NAME */}
              <Text style={styles.label}>Class Name *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., Introduction to Psychology"
                placeholderTextColor={colors.textLight}
                value={name}
                onChangeText={setName}
              />

              {/* SECTION */}
              <Text style={styles.label}>Section (Optional)</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., Section A"
                placeholderTextColor={colors.textLight}
                value={section}
                onChangeText={setSection}
              />

              {/* DAYS */}
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

              {/* TIME PICKERS */}
              <Text style={styles.label}>Start Time *</Text>
              <TouchableOpacity style={styles.input} onPress={() => setShowStartTimePicker(true)}>
                <Text style={styles.inputText}>{formatTime12H(startTime)}</Text>
              </TouchableOpacity>
              {showStartTimePicker && (
                <DateTimePicker
                  value={startTime}
                  mode="time"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={(event, date) => {
                    setShowStartTimePicker(Platform.OS === 'ios');
                    if (date) setStartTime(date);
                  }}
                />
              )}

              <Text style={styles.label}>End Time *</Text>
              <TouchableOpacity style={styles.input} onPress={() => setShowEndTimePicker(true)}>
                <Text style={styles.inputText}>{formatTime12H(endTime)}</Text>
              </TouchableOpacity>
              {showEndTimePicker && (
                <DateTimePicker
                  value={endTime}
                  mode="time"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={(event, date) => {
                    setShowEndTimePicker(Platform.OS === 'ios');
                    if (date) setEndTime(date);
                  }}
                />
              )}

              {/* PROFESSOR */}
              <Text style={styles.label}>Professor</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., Dr. Smith"
                placeholderTextColor={colors.textLight}
                value={professor}
                onChangeText={setProfessor}
              />

              {/* START DATE */}
              <Text style={styles.label}>Start Date *</Text>
              <TouchableOpacity style={styles.input} onPress={() => setShowStartDatePicker(true)}>
                <Text style={styles.inputText}>
                  {startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </Text>
              </TouchableOpacity>

              {showStartDatePicker && (
                <DateTimePicker
                  value={startDate}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={(event, date) => {
                    setShowStartDatePicker(Platform.OS === 'ios');
                    if (date) setStartDate(date);
                  }}
                />
              )}

              {/* END DATE */}
              <Text style={styles.label}>End Date *</Text>
              <TouchableOpacity style={styles.input} onPress={() => setShowEndDatePicker(true)}>
                <Text style={styles.inputText}>
                  {endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </Text>
              </TouchableOpacity>

              {showEndDatePicker && (
                <DateTimePicker
                  value={endDate}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={(event, date) => {
                    setShowEndDatePicker(Platform.OS === 'ios');
                    if (date) setEndDate(date);
                  }}
                />
              )}

              {/* COLOR PICKER */}
              <Text style={styles.label}>Color</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.colorGrid}>
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
              </ScrollView>

              {/* SUBMIT BUTTON */}
              <TouchableOpacity
                style={styles.createButton}
                onPress={handleAddClass}
              >
                <Text style={styles.createButtonText}>{isEditing ? 'Update Class' : 'Add Class'}</Text>
              </TouchableOpacity>
            </ScrollView>
          </Animated.View>
        </View>
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
              <Text style={styles.actionButtonText}>Edit Class</Text>
            </TouchableOpacity>
            <View style={styles.actionDivider} />
            <TouchableOpacity style={styles.actionButton} onPress={handleDelete}>
              <Trash2 size={20} color="#FF3B30" />
              <Text style={[styles.actionButtonText, { color: '#FF3B30' }]}>Delete Class</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}


const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
  },
  title: { fontSize: 32, fontWeight: '800', color: colors.text },
  subtitle: { fontSize: 14, color: colors.textSecondary, marginTop: 4 },
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

  searchContainer: { paddingHorizontal: 20, marginBottom: 16 },

  scrollView: { flex: 1 },

  emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: 80 },
  emptyText: { fontSize: 20, fontWeight: '600', color: colors.textSecondary, marginTop: 16 },
  emptySubtext: { fontSize: 14, color: colors.textLight, marginTop: 8 },

  classList: { paddingHorizontal: 20, paddingBottom: 20 },

  classCard: { backgroundColor: colors.surface, borderRadius: 16, padding: 16, marginBottom: 12, flexDirection: 'row', borderLeftWidth: 6, elevation: 3 },
  classIconContainer: { width: 56, height: 56, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  classContent: { flex: 1 },
  className: { fontSize: 17, fontWeight: '700', color: colors.text, marginBottom: 4 },
  classSection: { fontSize: 14, color: colors.textSecondary, marginBottom: 8 },

  classMetaRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  classMetaText: { fontSize: 13, color: colors.textSecondary, marginLeft: 6 },

  classDates: { fontSize: 12, color: colors.textLight, marginTop: 8 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { backgroundColor: colors.surface, borderRadius: 24, padding: 24, width: '100%', maxWidth: 500, maxHeight: '90%' },

  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  modalTitle: { fontSize: 24, fontWeight: '700', color: colors.text },

  label: { fontSize: 14, fontWeight: '600', color: colors.text, marginBottom: 8, marginTop: 16 },

  input: { backgroundColor: colors.background, borderRadius: 12, padding: 16, fontSize: 16, color: colors.text, borderWidth: 1, borderColor: colors.border },
  inputText: { fontSize: 16, color: colors.text },

  daysGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  dayChip: { paddingHorizontal: 12, paddingVertical: 10, borderRadius: 20, backgroundColor: colors.background, borderWidth: 2, borderColor: colors.border },
  dayChipText: { fontSize: 14, fontWeight: '600', color: colors.text },

  colorGrid: { flexDirection: 'row', gap: 12 },
  colorOption: { width: 44, height: 44, borderRadius: 22, borderWidth: 3, borderColor: 'transparent' },
  colorOptionSelected: { borderColor: colors.text },

  createButton: { backgroundColor: colors.primary, borderRadius: 12, padding: 18, alignItems: 'center', marginTop: 24, marginBottom: 8 },
  createButtonDisabled: { opacity: 0.5 },
  createButtonText: { fontSize: 16, fontWeight: '700', color: colors.surface },

  actionSheetOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'flex-end' },
  actionSheetContent: { backgroundColor: colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 40 },
  actionButton: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16, paddingHorizontal: 20 },
  actionButtonText: { fontSize: 16, fontWeight: '600', color: colors.text, marginLeft: 16 },
  actionDivider: { height: 1, backgroundColor: colors.border, marginVertical: 8 },
});
