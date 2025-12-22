import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, ChevronRight, X } from 'lucide-react-native';
import colors from '@/constants/colors';
import { useApp } from '@/contexts/AppContext';

type ViewMode = 'month' | 'week' | 'day';

export default function CalendarScreen() {
  const { sortedTasks, classes, calendarSyncEnabled, toggleCalendarSync } = useApp();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  // Debug: Log classes to see if they're loaded
  React.useEffect(() => {
    console.log('📚 Calendar - Total classes loaded:', classes.length);
    if (classes.length > 0) {
      console.log('📚 Calendar - First class:', classes[0]);
    }
  }, [classes]);

  const formatMonthYear = (date: Date) => {
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  const formatWeekRange = (date: Date) => {
    const start = new Date(date);
    start.setDate(date.getDate() - date.getDay());
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
  };

  const formatDay = (date: Date) => {
    return date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  };

  const navigatePrevious = () => {
    const newDate = new Date(currentDate);
    if (viewMode === 'month') {
      newDate.setMonth(currentDate.getMonth() - 1);
    } else if (viewMode === 'week') {
      newDate.setDate(currentDate.getDate() - 7);
    } else {
      newDate.setDate(currentDate.getDate() - 1);
    }
    setCurrentDate(newDate);
  };

  const navigateNext = () => {
    const newDate = new Date(currentDate);
    if (viewMode === 'month') {
      newDate.setMonth(currentDate.getMonth() + 1);
    } else if (viewMode === 'week') {
      newDate.setDate(currentDate.getDate() + 7);
    } else {
      newDate.setDate(currentDate.getDate() + 1);
    }
    setCurrentDate(newDate);
  };

  const getMonthDays = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startDayOfWeek = firstDay.getDay();

    const days = [];
    for (let i = 0; i < startDayOfWeek; i++) {
      days.push(null);
    }
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i));
    }
    return days;
  };

  const getWeekDays = (date: Date) => {
    const days = [];
    const startOfWeek = new Date(date);
    startOfWeek.setDate(date.getDate() - date.getDay());

    for (let i = 0; i < 7; i++) {
      const day = new Date(startOfWeek);
      day.setDate(startOfWeek.getDate() + i);
      days.push(day);
    }
    return days;
  };

  const getTasksForDate = (date: Date | null) => {
    if (!date) return [];
    // Format date in local timezone to avoid UTC conversion issues
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;
    return sortedTasks.filter(task => task.dueDate === dateStr);
  };

  const getClassesForDate = (date: Date | null) => {
    if (!date) return [];
    const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });

    const filtered = classes.filter(cls => {
      // Check if the class occurs on this day of the week
      if (!cls.daysOfWeek.includes(dayName)) return false;

      // Parse start and end dates (they're stored as YYYY-MM-DD strings)
      const classStart = new Date(cls.startDate + 'T00:00:00');
      const classEnd = new Date(cls.endDate + 'T23:59:59');

      // Create a date at midnight for comparison
      const checkDate = new Date(date);
      checkDate.setHours(0, 0, 0, 0);

      // Check if the date falls within the class date range
      const inRange = checkDate >= classStart && checkDate <= classEnd;

      // Debug logging
      if (inRange) {
        console.log(`✅ Class "${cls.name}" matches ${dayName} ${date.toLocaleDateString()}`);
      }

      return inRange;
    });

    // Deduplicate by class ID
    const uniqueClasses = Array.from(
      new Map(filtered.map(cls => [cls.id, cls])).values()
    );

    return uniqueClasses;
  };

  const renderMonthView = () => {
    const days = getMonthDays(currentDate);
    const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    return (
      <View style={styles.monthGrid}>
        <View style={styles.weekDaysRow}>
          {weekDays.map((day) => (
            <Text key={day} style={styles.weekDayText}>{day}</Text>
          ))}
        </View>
        <View style={styles.daysGrid}>
          {days.map((day, index) => {
            const tasks = getTasksForDate(day);
            const dayClasses = getClassesForDate(day);
            const isToday = day && day.toDateString() === new Date().toDateString();
            const isSelected = day && selectedDate && day.toDateString() === selectedDate.toDateString();

            const allEvents = [
              ...tasks.map(t => ({ id: t.id, color: colors.taskColors[t.type] })),
              ...dayClasses.map(c => ({ id: c.id, color: c.color }))
            ];

            const hasMore = allEvents.length > 3;
            const displayEvents = hasMore ? allEvents.slice(0, 2) : allEvents.slice(0, 3);

            return (
              <TouchableOpacity
                key={index}
                style={styles.dayCell}
                onPress={() => day && setSelectedDate(day)}
                disabled={!day}
              >
                {day && (
                  <>
                    <View style={[
                      styles.dayNumber,
                      isToday && styles.dayNumberToday,
                      isSelected && !isToday && styles.dayNumberSelected,
                    ]}>
                      <Text style={[
                        styles.dayNumberText,
                        isToday && styles.dayNumberTextToday,
                        isSelected && !isToday && styles.dayNumberTextSelected,
                      ]}>
                        {day.getDate()}
                      </Text>
                    </View>
                    <View style={styles.dayEvents}>
                      {displayEvents.map((event, i) => (
                        <View
                          key={`${event.id}-${i}`}
                          style={[styles.eventDot, { backgroundColor: event.color }]}
                        />
                      ))}
                      {hasMore && (
                        <Text style={styles.moreEventsText}>+</Text>
                      )}
                    </View>
                  </>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    );
  };

  const renderWeekView = () => {
    const days = getWeekDays(currentDate);

    return (
      <ScrollView style={styles.weekView}>
        {days.map((day) => {
          const tasks = getTasksForDate(day);
          const dayClasses = getClassesForDate(day);
          const isToday = day.toDateString() === new Date().toDateString();

          return (
            <View key={day.toISOString()} style={styles.weekDayCard}>
              <View style={[styles.weekDayHeader, isToday && styles.weekDayHeaderToday]}>
                <Text style={[styles.weekDayName, isToday && styles.weekDayNameToday]}>
                  {day.toLocaleDateString('en-US', { weekday: 'short' })}
                </Text>
                <Text style={[styles.weekDayDate, isToday && styles.weekDayDateToday]}>
                  {day.getDate()}
                </Text>
              </View>
              <View style={styles.weekDayContent}>
                {dayClasses.map((cls) => (
                  <View key={cls.id} style={[styles.classItem, { borderLeftColor: cls.color }]}>
                    <Text style={styles.classItemTitle}>{cls.name}</Text>
                    <Text style={styles.classItemTime}>{cls.time}</Text>
                  </View>
                ))}
                {tasks.map((task) => (
                  <View key={task.id} style={[styles.taskItem, { borderLeftColor: colors.taskColors[task.type] }]}>
                    <Text style={styles.taskItemTitle}>{task.description}</Text>
                    <Text style={styles.taskItemType}>
                      {task.type}{task.dueTime && ` • ${task.dueTime}`}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          );
        })}
      </ScrollView>
    );
  };

  const renderDayView = () => {
    const tasks = getTasksForDate(currentDate);
    const dayClasses = getClassesForDate(currentDate);

    return (
      <ScrollView style={styles.dayView}>
        <Text style={styles.sectionTitle}>Classes</Text>
        {dayClasses.length === 0 ? (
          <Text style={styles.emptyText}>No classes scheduled</Text>
        ) : (
          dayClasses.map((cls) => (
            <View key={cls.id} style={[styles.dayClassCard, { borderLeftColor: cls.color }]}>
              <Text style={styles.dayClassTitle}>{cls.name}</Text>
              <Text style={styles.dayClassMeta}>
                {cls.section && `${cls.section} • `}{cls.time}
              </Text>
              {cls.professor && (
                <Text style={styles.dayClassProf}>{cls.professor}</Text>
              )}
            </View>
          ))
        )}

        <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Tasks & Events</Text>
        {tasks.length === 0 ? (
          <Text style={styles.emptyText}>No tasks or events</Text>
        ) : (
          tasks.map((task) => (
            <View key={task.id} style={[styles.dayTaskCard, { borderLeftColor: colors.taskColors[task.type] }]}>
              <View style={styles.dayTaskHeader}>
                <Text style={styles.dayTaskTitle}>{task.description}</Text>
                <View style={[styles.dayTaskBadge, { backgroundColor: colors.taskColors[task.type] }]}>
                  <Text style={styles.dayTaskBadgeText}>{task.type}</Text>
                </View>
              </View>
              {task.dueTime && (
                <Text style={styles.dayTaskTime}>{task.dueTime}</Text>
              )}
              {task.className && (
                <Text style={styles.dayTaskClass}>{task.className}</Text>
              )}
            </View>
          ))
        )}
      </ScrollView>
    );
  };

  const handleToggleCalendarSync = async () => {
    if (calendarSyncEnabled) {
      // Disable sync
      Alert.alert(
        'Disable Calendar Sync',
        'This will stop syncing new tasks to your calendar. Existing calendar events will not be removed.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Disable',
            style: 'destructive',
            onPress: async () => {
              await toggleCalendarSync(false);
            },
          },
        ]
      );
    } else {
      // Enable sync
      const success = await toggleCalendarSync(true);
      if (success) {
        Alert.alert(
          'Calendar Sync Enabled',
          'Your tasks will now be synced to your device calendar in the "Student Planner" calendar.',
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert(
          'Calendar Sync Failed',
          'Unable to enable calendar sync. Please make sure you have granted calendar permissions.',
          [{ text: 'OK' }]
        );
      }
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Calendar</Text>
        <View style={styles.syncContainer}>
          <Text style={styles.calendarSyncText}>Sync Calendar</Text>
          <Switch
            value={calendarSyncEnabled}
            onValueChange={handleToggleCalendarSync}
            trackColor={{ false: colors.border, true: colors.primary }}
            thumbColor={colors.surface}
            ios_backgroundColor={colors.border}
          />
        </View>
      </View>

      <View style={styles.controls}>
        <View style={styles.viewModeToggle}>
          <TouchableOpacity
            style={[styles.viewModeButton, viewMode === 'month' && styles.viewModeButtonActive]}
            onPress={() => setViewMode('month')}
          >
            <Text style={[styles.viewModeText, viewMode === 'month' && styles.viewModeTextActive]}>
              Month
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.viewModeButton, viewMode === 'week' && styles.viewModeButtonActive]}
            onPress={() => setViewMode('week')}
          >
            <Text style={[styles.viewModeText, viewMode === 'week' && styles.viewModeTextActive]}>
              Week
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.viewModeButton, viewMode === 'day' && styles.viewModeButtonActive]}
            onPress={() => setViewMode('day')}
          >
            <Text style={[styles.viewModeText, viewMode === 'day' && styles.viewModeTextActive]}>
              Day
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.navigation}>
        <TouchableOpacity style={styles.navButton} onPress={navigatePrevious}>
          <ChevronLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.dateTitle}>
          {viewMode === 'month' && formatMonthYear(currentDate)}
          {viewMode === 'week' && formatWeekRange(currentDate)}
          {viewMode === 'day' && formatDay(currentDate)}
        </Text>
        <TouchableOpacity style={styles.navButton} onPress={navigateNext}>
          <ChevronRight size={24} color={colors.text} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.calendarScrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.calendarScrollContent}
      >
        {viewMode === 'month' && renderMonthView()}
        {viewMode === 'month' && selectedDate && (
          <View style={styles.selectedDaySection}>
            <View style={styles.selectedDayHeader}>
              <Text style={styles.selectedDayTitle}>
                {selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
              </Text>
              <TouchableOpacity onPress={() => setSelectedDate(null)} style={styles.clearButton}>
                <X size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <View style={styles.selectedDayContent}>
              {(() => {
                const tasks = getTasksForDate(selectedDate);
                const dayClasses = getClassesForDate(selectedDate);

                return (
                  <>
                    {dayClasses.length > 0 && (
                      <>
                        <Text style={styles.selectedDaySectionTitle}>Classes</Text>
                        {dayClasses.map((cls) => (
                          <View key={cls.id} style={[styles.selectedDayItem, { borderLeftColor: cls.color }]}>
                            <Text style={styles.selectedDayItemTitle}>{cls.name}</Text>
                            <Text style={styles.selectedDayItemMeta}>{cls.time}</Text>
                          </View>
                        ))}
                      </>
                    )}
                    {tasks.length > 0 && (
                      <>
                        <Text style={[styles.selectedDaySectionTitle, dayClasses.length > 0 && { marginTop: 16 }]}>Tasks</Text>
                        {tasks.map((task) => (
                          <View key={task.id} style={[styles.selectedDayItem, { borderLeftColor: colors.taskColors[task.type] }]}>
                            <Text style={styles.selectedDayItemTitle}>{task.description}</Text>
                            <Text style={styles.selectedDayItemMeta}>
                              {task.type} {task.dueTime && `• ${task.dueTime}`}
                            </Text>
                          </View>
                        ))}
                      </>
                    )}
                    {tasks.length === 0 && dayClasses.length === 0 && (
                      <Text style={styles.emptyText}>No tasks or classes scheduled</Text>
                    )}
                  </>
                );
              })()}
            </View>
          </View>
        )}
        {viewMode === 'week' && renderWeekView()}
        {viewMode === 'day' && renderDayView()}
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
  syncContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  calendarSyncText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: colors.textSecondary,
  },
  controls: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  viewModeToggle: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 4,
  },
  viewModeButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  viewModeButtonActive: {
    backgroundColor: colors.primary,
  },
  viewModeText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: colors.textSecondary,
  },
  viewModeTextActive: {
    color: colors.surface,
  },
  navigation: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  navButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderRadius: 20,
  },
  dateTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: colors.text,
  },
  calendarScrollView: {
    flex: 1,
  },
  calendarScrollContent: {
    flexGrow: 1,
    paddingBottom: 50,
  },
  monthGrid: {
    paddingHorizontal: 20,
  },
  weekDaysRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  weekDayText: {
    flex: 1,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '600' as const,
    color: colors.textSecondary,
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    padding: 4,
  },
  dayNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
  },
  dayNumberToday: {
    backgroundColor: colors.primary,
  },
  dayNumberSelected: {
    backgroundColor: colors.primary + '30', // 30% opacity
    borderRadius: 16,

  },
  dayNumberText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: colors.text,
  },
  dayNumberTextToday: {
    color: colors.surface,
  },
  dayNumberTextSelected: {
    color: colors.primary,
  },
  dayEvents: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 4,
    gap: 2,
  },
  eventDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  weekView: {
    flex: 1,
    paddingHorizontal: 20,
  },
  weekDayCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    marginBottom: 12,
    overflow: 'hidden',
  },
  weekDayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: colors.background,
  },
  weekDayHeaderToday: {
    backgroundColor: colors.primary,
  },
  weekDayName: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: colors.text,
  },
  weekDayNameToday: {
    color: colors.surface,
  },
  weekDayDate: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: colors.text,
  },
  weekDayDateToday: {
    color: colors.surface,
  },
  weekDayContent: {
    padding: 16,
  },
  classItem: {
    borderLeftWidth: 4,
    paddingLeft: 12,
    marginBottom: 12,
  },
  classItemTitle: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: colors.text,
    marginBottom: 2,
  },
  classItemTime: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  taskItem: {
    borderLeftWidth: 4,
    paddingLeft: 12,
    marginBottom: 12,
  },
  taskItemTitle: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: colors.text,
    marginBottom: 2,
  },
  taskItemType: {
    fontSize: 13,
    color: colors.textSecondary,
    textTransform: 'capitalize',
  },
  dayView: {
    flex: 1,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: colors.text,
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 14,
    color: colors.textLight,
    fontStyle: 'italic',
    marginBottom: 16,
  },
  dayClassCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
  },
  dayClassTitle: {
    fontSize: 17,
    fontWeight: '700' as const,
    color: colors.text,
    marginBottom: 4,
  },
  dayClassMeta: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  dayClassProf: {
    fontSize: 13,
    color: colors.textLight,
  },
  dayTaskCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
  },
  dayTaskHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  dayTaskTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: colors.text,
    flex: 1,
    marginRight: 8,
  },
  dayTaskBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  dayTaskBadgeText: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: colors.surface,
    textTransform: 'capitalize',
  },
  dayTaskTime: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  dayTaskClass: {
    fontSize: 13,
    color: colors.textLight,
  },
  selectedDaySection: {
    backgroundColor: colors.surface,
    marginHorizontal: 20,
    marginTop: 16,
    borderRadius: 16,
  },
  selectedDayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  selectedDayTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: colors.text,
  },
  clearButton: {
    padding: 4,
  },
  selectedDayContent: {
    padding: 16,
  },
  selectedDayContentScrollView: {
    maxHeight: 300,

  },
  selectedDaySectionTitle: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: colors.textSecondary,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  selectedDayItem: {
    borderLeftWidth: 4,
    paddingLeft: 12,
    marginBottom: 12,
  },
  selectedDayItemTitle: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: colors.text,
    marginBottom: 2,
  },
  selectedDayItemMeta: {
    fontSize: 13,
    color: colors.textSecondary,
    textTransform: 'capitalize',
  },
  moreEventsText: {
    fontSize: 10,
    color: colors.textSecondary,
    marginTop: -2,
    marginLeft: 1,
    fontWeight: '700',
  },
});
