import * as Calendar from 'expo-calendar';
import { Platform } from 'react-native';
import { Task, Class } from '@/types';

const APP_CALENDAR_NAME = 'Cause Planner';
const APP_CALENDAR_COLOR = '#6366F1';

/**
 * Request calendar permissions.
 * Returns:
 *  'granted'  — ready to use
 *  'blocked'  — user previously denied; must open Settings
 *  'denied'   — user just denied the prompt
 */
export async function requestCalendarPermissions(): Promise<'granted' | 'blocked' | 'denied'> {
  try {
    const { status: current } = await Calendar.getCalendarPermissionsAsync();
    if (current === 'granted') return 'granted';

    // On iOS, once denied the OS will not show the prompt again — app must
    // send the user to Settings. 'undetermined' means first-time request.
    if (current === 'denied') return 'blocked';

    const { status } = await Calendar.requestCalendarPermissionsAsync();
    return status === 'granted' ? 'granted' : 'denied';
  } catch (error) {
    console.error('Error requesting calendar permissions:', error);
    return 'denied';
  }
}

/**
 * Check if calendar permissions are already granted (no prompt).
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

/**
 * Verify a stored calendar ID still exists and allows writes.
 * Used on startup to detect calendars deleted by the user.
 */
export async function validateCalendarId(calendarId: string): Promise<boolean> {
  try {
    const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
    return calendars.some(
      cal => cal.id === calendarId && cal.allowsModifications
    );
  } catch {
    return false;
  }
}

/**
 * Get the app's dedicated calendar or create it if it doesn't exist.
 *
 * iOS fix: uses Calendar.getSourcesAsync() to find the LOCAL source first
 * (always available), then iCloud, then any CALDAV. Exchange / Gmail sources
 * frequently reject third-party calendar creation and were causing silent
 * failures on iOS devices with corporate or Google accounts.
 */
export async function getOrCreateAppCalendar(): Promise<string | null> {
  try {
    const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);

    // Reuse existing calendar only if it still allows modifications
    const existing = calendars.find(
      cal => cal.title === APP_CALENDAR_NAME && cal.allowsModifications
    );
    if (existing) return existing.id;

    let sourceId: string | undefined;
    let source: Calendar.Source | undefined;
    let ownerAccount: string;

    if (Platform.OS === 'ios') {
      // iOS requires picking the right source. Preference order:
      // 1. LOCAL  — always present, no account dependency
      // 2. iCloud CALDAV — syncs across devices
      // 3. Any other CALDAV
      // Exchange and Gmail sources commonly reject createCalendarAsync.
      const sources = await Calendar.getSourcesAsync();

      const localSource = sources.find(
        s => s.type === Calendar.SourceType.LOCAL
      );
      const icloudSource = sources.find(
        s =>
          s.type === Calendar.SourceType.CALDAV &&
          s.name.toLowerCase().includes('icloud')
      );
      const caldavSource = sources.find(
        s => s.type === Calendar.SourceType.CALDAV
      );

      const best = localSource ?? icloudSource ?? caldavSource;
      if (!best) {
        console.error('No valid iOS calendar source found');
        return null;
      }

      sourceId = best.id;
      source = best;
      ownerAccount = best.name || 'Cause Planner';
    } else {
      // Android: find any modifiable calendar's source
      const base = calendars.find(cal => cal.allowsModifications && cal.source);
      if (!base?.source) {
        console.error('No valid Android calendar source found');
        return null;
      }
      sourceId = base.source.id;
      source = base.source;
      ownerAccount = base.source.name || 'Cause Planner';
    }

    const newCalendarId = await Calendar.createCalendarAsync({
      title: APP_CALENDAR_NAME,
      color: APP_CALENDAR_COLOR,
      entityType: Calendar.EntityTypes.EVENT,
      sourceId,
      source,
      name: 'studentPlanner',
      ownerAccount,
      accessLevel: Calendar.CalendarAccessLevel.OWNER,
    });

    return newCalendarId;
  } catch (error) {
    console.error('Error getting/creating calendar:', error);
    return null;
  }
}

function getReminderMinutes(reminder?: string): number {
  switch (reminder) {
    case '1h': return 60;
    case '2h': return 120;
    case '1d': return 1440;
    case '2d': return 2880;
    default: return 60;
  }
}

function getDayNumber(dayName: string): number {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return days.indexOf(dayName) + 1;
}

export async function syncTaskToCalendar(
  task: Task,
  calendarId: string
): Promise<string | null> {
  try {
    const [year, month, day] = task.dueDate.split('-').map(Number);

    let startDate: Date;
    let endDate: Date;
    let allDay = false;

    if (task.dueTime) {
      const [hours, minutes] = task.dueTime.split(':').map(Number);
      startDate = new Date(year, month - 1, day, hours, minutes, 0, 0);
      const duration = task.type === 'exam' || task.type === 'appointment' ? 30 : 60;
      endDate = new Date(startDate.getTime() + duration * 60 * 1000);
    } else {
      startDate = new Date(year, month - 1, day, 0, 0, 0, 0);
      endDate = new Date(year, month - 1, day, 23, 59, 59, 999);
      allDay = true;
    }

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

export async function syncClassToCalendar(
  cls: Class,
  calendarId: string
): Promise<string | null> {
  try {
    const [startTimeStr, endTimeStr] = cls.time.split(' - ');

    const startTimeParts = startTimeStr.trim().match(/(\d+):(\d+)\s*(AM|PM)/i);
    if (!startTimeParts) {
      console.error('Invalid start time format:', cls.time);
      return null;
    }

    let startHours = parseInt(startTimeParts[1]);
    const startMinutes = parseInt(startTimeParts[2]);
    const startPeriod = startTimeParts[3].toUpperCase();
    if (startPeriod === 'PM' && startHours !== 12) startHours += 12;
    else if (startPeriod === 'AM' && startHours === 12) startHours = 0;

    const endTimeParts = endTimeStr?.trim().match(/(\d+):(\d+)\s*(AM|PM)/i);
    if (!endTimeParts) {
      console.error('Invalid end time format:', cls.time);
      return null;
    }

    let endHours = parseInt(endTimeParts[1]);
    const endMinutes = parseInt(endTimeParts[2]);
    const endPeriod = endTimeParts[3].toUpperCase();
    if (endPeriod === 'PM' && endHours !== 12) endHours += 12;
    else if (endPeriod === 'AM' && endHours === 12) endHours = 0;

    const [sYear, sMonth, sDay] = cls.startDate.split('-').map(Number);
    const semesterStart = new Date(sYear, sMonth - 1, sDay);

    const [eYear, eMonth, eDay] = cls.endDate.split('-').map(Number);
    const semesterEnd = new Date(eYear, eMonth - 1, eDay);

    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const classDayNumbers = cls.daysOfWeek.map(d => dayNames.indexOf(d));

    let firstOccurrence = new Date(semesterStart);
    let daysToAdd = 0;
    for (let i = 0; i < 7; i++) {
      if (classDayNumbers.includes((firstOccurrence.getDay() + i) % 7)) {
        daysToAdd = i;
        break;
      }
    }
    firstOccurrence.setDate(firstOccurrence.getDate() + daysToAdd);

    const startDate = new Date(firstOccurrence);
    startDate.setHours(startHours, startMinutes, 0, 0);

    const endDate = new Date(firstOccurrence);
    endDate.setHours(endHours, endMinutes, 0, 0);

    const daysOfTheWeek = cls.daysOfWeek.map(d => ({ dayOfTheWeek: getDayNumber(d) }));

    const eventDetails: Partial<Calendar.Event> = {
      title: cls.name,
      startDate,
      endDate,
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      location: cls.section,
      notes: `Professor: ${cls.professor || 'N/A'}\nSection: ${cls.section || 'N/A'}`,
      recurrenceRule: {
        frequency: Calendar.Frequency.WEEKLY,
        daysOfTheWeek,
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

export async function updateCalendarEvent(
  eventId: string,
  task: Task
): Promise<boolean> {
  try {
    const [year, month, day] = task.dueDate.split('-').map(Number);

    let startDate: Date;
    let endDate: Date;
    let allDay = false;

    if (task.dueTime) {
      const [hours, minutes] = task.dueTime.split(':').map(Number);
      startDate = new Date(year, month - 1, day, hours, minutes, 0, 0);
      const duration = task.type === 'exam' || task.type === 'appointment' ? 30 : 60;
      endDate = new Date(startDate.getTime() + duration * 60 * 1000);
    } else {
      startDate = new Date(year, month - 1, day, 0, 0, 0, 0);
      endDate = new Date(year, month - 1, day, 23, 59, 59, 999);
      allDay = true;
    }

    await Calendar.updateEventAsync(eventId, {
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
    });

    return true;
  } catch (error) {
    console.error('Error updating calendar event:', error);
    return false;
  }
}

export async function updateClassEvent(
  eventId: string,
  cls: Class
): Promise<boolean> {
  try {
    const [startTimeStr, endTimeStr] = cls.time.split(' - ');

    const startTimeParts = startTimeStr.trim().match(/(\d+):(\d+)\s*(AM|PM)/i);
    if (!startTimeParts) return false;

    let startHours = parseInt(startTimeParts[1]);
    const startMinutes = parseInt(startTimeParts[2]);
    const startPeriod = startTimeParts[3].toUpperCase();
    if (startPeriod === 'PM' && startHours !== 12) startHours += 12;
    else if (startPeriod === 'AM' && startHours === 12) startHours = 0;

    const endTimeParts = endTimeStr?.trim().match(/(\d+):(\d+)\s*(AM|PM)/i);
    if (!endTimeParts) return false;

    let endHours = parseInt(endTimeParts[1]);
    const endMinutes = parseInt(endTimeParts[2]);
    const endPeriod = endTimeParts[3].toUpperCase();
    if (endPeriod === 'PM' && endHours !== 12) endHours += 12;
    else if (endPeriod === 'AM' && endHours === 12) endHours = 0;

    const [sYear, sMonth, sDay] = cls.startDate.split('-').map(Number);
    const semesterStart = new Date(sYear, sMonth - 1, sDay);

    const [eYear, eMonth, eDay] = cls.endDate.split('-').map(Number);
    const semesterEnd = new Date(eYear, eMonth - 1, eDay);

    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const classDayNumbers = cls.daysOfWeek.map(d => dayNames.indexOf(d));

    let firstOccurrence = new Date(semesterStart);
    let daysToAdd = 0;
    for (let i = 0; i < 7; i++) {
      if (classDayNumbers.includes((firstOccurrence.getDay() + i) % 7)) {
        daysToAdd = i;
        break;
      }
    }
    firstOccurrence.setDate(firstOccurrence.getDate() + daysToAdd);

    const startDate = new Date(firstOccurrence);
    startDate.setHours(startHours, startMinutes, 0, 0);

    const endDate = new Date(firstOccurrence);
    endDate.setHours(endHours, endMinutes, 0, 0);

    const daysOfTheWeek = cls.daysOfWeek.map(d => ({ dayOfTheWeek: getDayNumber(d) }));

    await Calendar.updateEventAsync(eventId, {
      title: cls.name,
      startDate,
      endDate,
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      location: cls.section,
      notes: `Professor: ${cls.professor || 'N/A'}\nSection: ${cls.section || 'N/A'}`,
      recurrenceRule: {
        frequency: Calendar.Frequency.WEEKLY,
        daysOfTheWeek,
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
 * Delete a calendar event. Treats "already deleted" as success so that
 * users manually removing events from the iOS Calendar app don't break sync.
 */
export async function deleteCalendarEvent(eventId: string): Promise<boolean> {
  try {
    await Calendar.deleteEventAsync(eventId);
    return true;
  } catch (error: any) {
    const msg: string = error?.message ?? '';
    // Event was already removed externally — treat as success
    if (
      msg.includes('not found') ||
      msg.includes('No event') ||
      msg.includes('invalid') ||
      msg.includes('does not exist')
    ) {
      return true;
    }
    console.error('Error deleting calendar event:', error);
    return false;
  }
}

export async function bulkSyncTasks(
  tasks: Task[],
  calendarId: string
): Promise<Map<string, string>> {
  const synced = new Map<string, string>();
  for (const task of tasks) {
    if (!task.calendarEventId && !task.completed) {
      const eventId = await syncTaskToCalendar(task, calendarId);
      if (eventId) synced.set(task.id, eventId);
    }
  }
  return synced;
}

export async function bulkSyncClasses(
  classes: Class[],
  calendarId: string
): Promise<Map<string, string>> {
  const synced = new Map<string, string>();
  for (const cls of classes) {
    if (!cls.calendarEventId) {
      const eventId = await syncClassToCalendar(cls, calendarId);
      if (eventId) synced.set(cls.id, eventId);
    }
  }
  return synced;
}
