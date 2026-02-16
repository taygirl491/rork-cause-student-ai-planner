import * as Calendar from 'expo-calendar';
import { Platform } from 'react-native';
import { Task, Class } from '@/types';

const APP_CALENDAR_NAME = 'Student Planner';
const APP_CALENDAR_COLOR = '#6366F1'; // Primary color

/**
 * Request calendar permissions from the user
 * @returns true if permissions granted, false otherwise
 */
export async function requestCalendarPermissions(): Promise<boolean> {
  try {
    const { status } = await Calendar.requestCalendarPermissionsAsync();
    return status === 'granted';
  } catch (error) {
    console.error('Error requesting calendar permissions:', error);
    return false;
  }
}

/**
 * Get the app's dedicated calendar or create it if it doesn't exist
 * @returns Calendar ID or null if failed
 */
export async function getOrCreateAppCalendar(): Promise<string | null> {
  try {
    // Get all calendars
    const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
    
    // Find our app's calendar
    const appCalendar = calendars.find(cal => cal.title === APP_CALENDAR_NAME);
    
    if (appCalendar) {
      return appCalendar.id;
    }
    
    // Create new calendar if it doesn't exist
    // Need to find a valid source
    const defaultCalendar = calendars.find(
      cal => cal.allowsModifications && cal.source
    );
    
    if (!defaultCalendar?.source) {
      console.error('No valid calendar source found');
      return null;
    }
    
    const newCalendarId = await Calendar.createCalendarAsync({
      title: APP_CALENDAR_NAME,
      color: APP_CALENDAR_COLOR,
      entityType: Calendar.EntityTypes.EVENT,
      sourceId: defaultCalendar.source.id,
      source: defaultCalendar.source,
      name: 'studentPlanner',
      ownerAccount: defaultCalendar.source.name,
      accessLevel: Calendar.CalendarAccessLevel.OWNER,
    });
    
    return newCalendarId;
  } catch (error) {
    console.error('Error getting/creating calendar:', error);
    return null;
  }
}

/**
 * Convert reminder time to minutes before event
 */
function getReminderMinutes(reminder?: string): number {
  switch (reminder) {
    case '1h': return 60;
    case '2h': return 120;
    case '1d': return 1440;
    case '2d': return 2880;
    default: return 60; // Default to 1 hour
  }
}

/**
 * Convert day name to Expo Calendar day number (Sunday=1, Monday=2, etc.)
 */
function getDayNumber(dayName: string): number {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return days.indexOf(dayName) + 1;
}

/**
 * Sync a task to the device calendar
 * @param task Task to sync
 * @param calendarId Calendar ID to sync to
 * @returns Event ID or null if failed
 */
export async function syncTaskToCalendar(
  task: Task,
  calendarId: string
): Promise<string | null> {
  try {
    // Parse the due date components (YYYY-MM-DD)
    const [year, month, day] = task.dueDate.split('-').map(Number);
    
    let startDate: Date;
    let endDate: Date;
    let allDay = false;

    if (task.dueTime) {
      // Parse time components (HH:MM)
      const [hours, minutes] = task.dueTime.split(':').map(Number);
      startDate = new Date(year, month - 1, day, hours, minutes);
      
      // Set end date to 1 hour after start (or 30 minutes for exams/appointments)
      const duration = task.type === 'exam' || task.type === 'appointment' ? 30 : 60;
      endDate = new Date(startDate.getTime() + duration * 60 * 1000);
    } else {
      // All day event
      startDate = new Date(year, month - 1, day);
      endDate = new Date(year, month - 1, day + 1); // Next day
      allDay = true;
    }
    
    // Create event details
    const eventDetails: Partial<Calendar.Event> = {
      title: task.description,
      startDate,
      endDate,
      allDay,
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      notes: `Type: ${task.type}\nPriority: ${task.priority}${
        task.className ? `\nClass: ${task.className}` : ''
      }`,
      alarms: task.alarmEnabled 
        ? [{ relativeOffset: -getReminderMinutes(task.reminder) }] 
        : [],
    };
    
    const eventId = await Calendar.createEventAsync(calendarId, eventDetails);
    return eventId;
  } catch (error) {
    console.error('Error syncing task to calendar:', error);
    return null;
  }
}

/**
 * Sync a class to the device calendar
 * @param cls Class to sync
 * @param calendarId Calendar ID to sync to
 * @returns Event ID or null if failed
 */
export async function syncClassToCalendar(
  cls: Class,
  calendarId: string
): Promise<string | null> {
  try {
    // Parse time string "HH:MM AM/PM - HH:MM AM/PM"
    const [startTimeStr, endTimeStr] = cls.time.split(' - ');
    
    // Parse start time
    const startTimeParts = startTimeStr.match(/(\d+):(\d+)\s*(AM|PM)/i);
    if (!startTimeParts) {
      console.error('Invalid time format:', cls.time);
      return null;
    }
    
    let startHours = parseInt(startTimeParts[1]);
    const startMinutes = parseInt(startTimeParts[2]);
    const startPeriod = startTimeParts[3].toUpperCase();
    
    // Convert to 24-hour format
    if (startPeriod === 'PM' && startHours !== 12) {
      startHours += 12;
    } else if (startPeriod === 'AM' && startHours === 12) {
      startHours = 0;
    }
    
    // Parse end time
    const endTimeParts = endTimeStr.match(/(\d+):(\d+)\s*(AM|PM)/i);
    if (!endTimeParts) {
      console.error('Invalid end time format:', cls.time);
      return null;
    }
    
    let endHours = parseInt(endTimeParts[1]);
    const endMinutes = parseInt(endTimeParts[2]);
    const endPeriod = endTimeParts[3].toUpperCase();
    
    // Convert to 24-hour format
    if (endPeriod === 'PM' && endHours !== 12) {
      endHours += 12;
    } else if (endPeriod === 'AM' && endHours === 12) {
      endHours = 0;
    }
    
    // Find the first occurrence of the class based on startDate and daysOfWeek
    // Parse start date as local date to avoid UTC shifts
    const [sYear, sMonth, sDay] = cls.startDate.split('-').map(Number);
    const semesterStart = new Date(sYear, sMonth - 1, sDay);
    
    // Parse end date as local date
    const [eYear, eMonth, eDay] = cls.endDate.split('-').map(Number);
    const semesterEnd = new Date(eYear, eMonth - 1, eDay);

    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    
    // Get the day numbers for the class days
    const classDayNumbers = cls.daysOfWeek.map(day => dayNames.indexOf(day));
    
    // Find the first day that matches one of the class days
    let firstOccurrence = new Date(semesterStart);
    let currentDayNumber = firstOccurrence.getDay();
    let daysToAdd = 0;
    
    // Find the nearest class day from the semester start
    for (let i = 0; i < 7; i++) {
      const checkDay = (currentDayNumber + i) % 7;
      if (classDayNumbers.includes(checkDay)) {
        daysToAdd = i;
        break;
      }
    }
    
    firstOccurrence.setDate(firstOccurrence.getDate() + daysToAdd);
    
    // Create start and end dates for the first occurrence
    const startDate = new Date(firstOccurrence);
    startDate.setHours(startHours, startMinutes, 0, 0);
    
    const endDate = new Date(firstOccurrence);
    endDate.setHours(endHours, endMinutes, 0, 0);
    
    const daysOfTheWeek = cls.daysOfWeek.map(day => ({
      dayOfTheWeek: getDayNumber(day)
    }));

    const eventDetails: Partial<Calendar.Event> = {
      title: cls.name,
      startDate,
      endDate,
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      location: cls.section,
      notes: `Professor: ${cls.professor || 'N/A'}\nSection: ${cls.section || 'N/A'}`,
      recurrenceRule: {
        frequency: Calendar.Frequency.WEEKLY,
        daysOfTheWeek: daysOfTheWeek,
        endDate: semesterEnd,
      },
    };

    const eventId = await Calendar.createEventAsync(calendarId, eventDetails);
    return eventId;
  } catch (error) {
    console.error('Error syncing class to calendar:', error);
    return null;
  }
}

/**
 * Update an existing calendar event
 * @param eventId Calendar event ID
 * @param task Updated task data
 * @returns true if successful, false otherwise
 */
export async function updateCalendarEvent(
  eventId: string,
  task: Task
): Promise<boolean> {
  try {
    // Parse the due date components (YYYY-MM-DD)
    const [year, month, day] = task.dueDate.split('-').map(Number);
    
    let startDate: Date;
    let endDate: Date;
    let allDay = false;

    if (task.dueTime) {
      // Parse time components (HH:MM)
      const [hours, minutes] = task.dueTime.split(':').map(Number);
      startDate = new Date(year, month - 1, day, hours, minutes);
      
      // Set end date to 1 hour after start (or 30 minutes for exams/appointments)
      const duration = task.type === 'exam' || task.type === 'appointment' ? 30 : 60;
      endDate = new Date(startDate.getTime() + duration * 60 * 1000);
    } else {
      // All day event
      startDate = new Date(year, month - 1, day);
      endDate = new Date(year, month - 1, day + 1); // Next day
      allDay = true;
    }
    
    await Calendar.updateEventAsync(eventId, {
      title: task.description,
      startDate,
      endDate,
      allDay,
      notes: `Type: ${task.type}\nPriority: ${task.priority}${
        task.className ? `\nClass: ${task.className}` : ''
      }`,
      alarms: task.alarmEnabled 
        ? [{ relativeOffset: -getReminderMinutes(task.reminder) }] 
        : [],
    });
    
    return true;
  } catch (error) {
    console.error('Error updating calendar event:', error);
    return false;
  }
}

/**
 * Update an existing class calendar event
 * @param eventId Calendar event ID
 * @param cls Updated class data
 * @returns true if successful, false otherwise
 */
export async function updateClassEvent(
  eventId: string,
  cls: Class
): Promise<boolean> {
  try {
    // Parse time string "HH:MM AM/PM - HH:MM AM/PM"
    const [startTimeStr, endTimeStr] = cls.time.split(' - ');
    
    // Parse start time
    const startTimeParts = startTimeStr.match(/(\d+):(\d+)\s*(AM|PM)/i);
    if (!startTimeParts) {
      console.error('Invalid time format:', cls.time);
      return false;
    }
    
    let startHours = parseInt(startTimeParts[1]);
    const startMinutes = parseInt(startTimeParts[2]);
    const startPeriod = startTimeParts[3].toUpperCase();
    
    // Convert to 24-hour format
    if (startPeriod === 'PM' && startHours !== 12) {
      startHours += 12;
    } else if (startPeriod === 'AM' && startHours === 12) {
      startHours = 0;
    }
    
    // Parse end time
    const endTimeParts = endTimeStr.match(/(\d+):(\d+)\s*(AM|PM)/i);
    if (!endTimeParts) {
      console.error('Invalid end time format:', cls.time);
      return false;
    }
    
    let endHours = parseInt(endTimeParts[1]);
    const endMinutes = parseInt(endTimeParts[2]);
    const endPeriod = endTimeParts[3].toUpperCase();
    
    // Convert to 24-hour format
    if (endPeriod === 'PM' && endHours !== 12) {
      endHours += 12;
    } else if (endPeriod === 'AM' && endHours === 12) {
      endHours = 0;
    }
    
    // Find the first occurrence of the class based on startDate and daysOfWeek
    // Parse start date as local date to avoid UTC shifts
    const [sYear, sMonth, sDay] = cls.startDate.split('-').map(Number);
    const semesterStart = new Date(sYear, sMonth - 1, sDay);
    
    // Parse end date as local date
    const [eYear, eMonth, eDay] = cls.endDate.split('-').map(Number);
    const semesterEnd = new Date(eYear, eMonth - 1, eDay);

    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    
    // Get the day numbers for the class days
    const classDayNumbers = cls.daysOfWeek.map(day => dayNames.indexOf(day));
    
    // Find the first day that matches one of the class days
    let firstOccurrence = new Date(semesterStart);
    let currentDayNumber = firstOccurrence.getDay();
    let daysToAdd = 0;
    
    // Find the nearest class day from the semester start
    for (let i = 0; i < 7; i++) {
      const checkDay = (currentDayNumber + i) % 7;
      if (classDayNumbers.includes(checkDay)) {
        daysToAdd = i;
        break;
      }
    }
    
    firstOccurrence.setDate(firstOccurrence.getDate() + daysToAdd);
    
    // Create start and end dates for the first occurrence
    const startDate = new Date(firstOccurrence);
    startDate.setHours(startHours, startMinutes, 0, 0);
    
    const endDate = new Date(firstOccurrence);
    endDate.setHours(endHours, endMinutes, 0, 0);
    
    const daysOfTheWeek = cls.daysOfWeek.map(day => ({
      dayOfTheWeek: getDayNumber(day)
    }));

    await Calendar.updateEventAsync(eventId, {
      title: cls.name,
      startDate,
      endDate,
      location: cls.section,
      notes: `Professor: ${cls.professor || 'N/A'}\nSection: ${cls.section || 'N/A'}`,
      recurrenceRule: {
        frequency: Calendar.Frequency.WEEKLY,
        daysOfTheWeek: daysOfTheWeek,
        endDate: semesterEnd,
      },
    });
    
    return true;
  } catch (error) {
    console.error('Error updating class event:', error);
    return false;
  }
}

/**
 * Delete a calendar event
 * @param eventId Calendar event ID
 * @returns true if successful, false otherwise
 */
export async function deleteCalendarEvent(eventId: string): Promise<boolean> {
  try {
    await Calendar.deleteEventAsync(eventId);
    return true;
  } catch (error) {
    console.error('Error deleting calendar event:', error);
    return false;
  }
}

/**
 * Bulk sync multiple tasks to calendar
 * @param tasks Tasks to sync
 * @param calendarId Calendar ID to sync to
 * @returns Map of task IDs to calendar event IDs
 */
export async function bulkSyncTasks(
  tasks: Task[],
  calendarId: string
): Promise<Map<string, string>> {
  const syncedTasks = new Map<string, string>();
  
  for (const task of tasks) {
    // Only sync tasks that aren't already synced and have future due dates
    if (!task.calendarEventId && !task.completed) {
      const eventId = await syncTaskToCalendar(task, calendarId);
      if (eventId) {
        syncedTasks.set(task.id, eventId);
      }
    }
  }
  
  return syncedTasks;
}

/**
 * Bulk sync multiple classes to calendar
 * @param classes Classes to sync
 * @param calendarId Calendar ID to sync to
 * @returns Map of class IDs to calendar event IDs
 */
export async function bulkSyncClasses(
  classes: Class[],
  calendarId: string
): Promise<Map<string, string>> {
  const syncedClasses = new Map<string, string>();
  
  for (const cls of classes) {
    // Only sync classes that aren't already synced
    if (!cls.calendarEventId) {
      const eventId = await syncClassToCalendar(cls, calendarId);
      if (eventId) {
        syncedClasses.set(cls.id, eventId);
      }
    }
  }
  
  return syncedClasses;
}

/**
 * Check if calendar permissions are granted
 * @returns true if permissions granted, false otherwise
 */
export async function hasCalendarPermissions(): Promise<boolean> {
  try {
    const { status } = await Calendar.getCalendarPermissionsAsync();
    return status === 'granted';
  } catch (error) {
    console.error('Error checking calendar permissions:', error);
    return false;
  }
}
