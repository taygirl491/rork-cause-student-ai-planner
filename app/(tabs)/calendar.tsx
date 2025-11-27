import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import colors from '@/constants/colors';
import { useApp } from '@/contexts/AppContext';

type ViewMode = 'month' | 'week' | 'day';

export default function CalendarScreen() {
  const { sortedTasks, classes } = useApp();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('month');

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
    const dateStr = date.toISOString().split('T')[0];
    return sortedTasks.filter(task => task.dueDate === dateStr);
  };

  const getClassesForDate = (date: Date | null) => {
    if (!date) return [];
    const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
    const dateStr = date.toISOString().split('T')[0];
    
    return classes.filter(cls => {
      const startDate = new Date(cls.startDate);
      const endDate = new Date(cls.endDate);
      const targetDate = new Date(dateStr);
      
      return cls.daysOfWeek.includes(dayName) && 
             targetDate >= startDate && 
             targetDate <= endDate;
    });
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
            
            return (
              <View key={index} style={styles.dayCell}>
                {day && (
                  <>
                    <View style={[styles.dayNumber, isToday && styles.dayNumberToday]}>
                      <Text style={[styles.dayNumberText, isToday && styles.dayNumberTextToday]}>
                        {day.getDate()}
                      </Text>
                    </View>
                    <View style={styles.dayEvents}>
                      {tasks.slice(0, 2).map((task) => (
                        <View
                          key={task.id}
                          style={[styles.eventDot, { backgroundColor: colors.taskColors[task.type] }]}
                        />
                      ))}
                      {dayClasses.slice(0, 2).map((cls) => (
                        <View
                          key={cls.id}
                          style={[styles.eventDot, { backgroundColor: cls.color }]}
                        />
                      ))}
                    </View>
                  </>
                )}
              </View>
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
                    <Text style={styles.taskItemType}>{task.type}</Text>
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

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Calendar</Text>
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

      {viewMode === 'month' && renderMonthView()}
      {viewMode === 'week' && renderWeekView()}
      {viewMode === 'day' && renderDayView()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
  },
  title: {
    fontSize: 32,
    fontWeight: '800' as const,
    color: colors.text,
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
  dayNumberText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: colors.text,
  },
  dayNumberTextToday: {
    color: colors.surface,
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
});
