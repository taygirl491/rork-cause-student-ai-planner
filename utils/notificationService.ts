import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { Task, ReminderTime, Goal } from '@/types';

// Configure notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/**
 * Request notification permissions from the user
 * @returns Promise<boolean> - true if permissions granted
 */
export async function requestNotificationPermissions(): Promise<boolean> {
  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('Notification permissions not granted');
      return false;
    }

    // Setup Android notification channel
    if (Platform.OS === 'android') {
      await setupNotificationChannels();
    }

    return true;
  } catch (error) {
    console.error('Error requesting notification permissions:', error);
    return false;
  }
}

/**
 * Setup Android notification channels
 */
export async function setupNotificationChannels() {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('task-reminders-v3', {
      name: 'Task Reminders',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#6366F1',
      sound: 'alarm_clock_90867.wav',
      enableVibrate: true,
    });
  }
}

/**
 * Register for push notifications and get the token
 * @returns Promise<string | undefined> - The Expo push token
 */
export async function registerForPushNotificationsAsync(): Promise<string | undefined> {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('task-reminders-v3', {
      name: 'Task Reminders',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#6366F1',
    });
  }

  if (Platform.OS === 'web') {
    return undefined;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.log('Failed to get push token for push notification!');
    return undefined;
  }

  try {
    const token = (await Notifications.getExpoPushTokenAsync({
        // projectId: Constants.expoConfig?.extra?.eas?.projectId, // Optional if configured in app.json
    })).data;
    console.log("Expo Push Token:", token);
    return token;
  } catch (error) {
    console.error("Error fetching push token:", error);
    return undefined;
  }
}

/**
 * Calculate the trigger time for a task reminder
 * @param task - The task to calculate reminder time for
 * @returns Date | null - The trigger date or null if invalid
 */
function calculateTriggerTime(task: Task): Date | null {
  if (!task.dueDate || !task.reminder) return null;

  const dueDate = new Date(task.dueDate);
  
  // If task has a specific time, use it
  if (task.dueTime) {
    const [hours, minutes] = task.dueTime.split(':');
    dueDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);
  } else {
    // Default to 9 AM if no time specified
    dueDate.setHours(9, 0, 0, 0);
  }

  let triggerDate = new Date(dueDate);

  switch (task.reminder) {
    case '1h':
      triggerDate.setHours(triggerDate.getHours() - 1);
      break;
    case '2h':
      triggerDate.setHours(triggerDate.getHours() - 2);
      break;
    case '1d':
      triggerDate.setDate(triggerDate.getDate() - 1);
      break;
    case '2d':
      triggerDate.setDate(triggerDate.getDate() - 2);
      break;
    case 'custom':
      if (task.customReminderDate) {
        triggerDate = new Date(task.customReminderDate);
      } else {
        return null;
      }
      break;
    default:
      return null;
  }

  // Don't schedule if in the past
  if (triggerDate <= new Date()) {
    console.log('Reminder time is in the past, not scheduling');
    return null;
  }

  return triggerDate;
}

/**
 * Get a human-readable reminder label
 */
function getReminderLabel(reminder: ReminderTime): string {
  switch (reminder) {
    case '1h':
      return '1 hour before';
    case '2h':
      return '2 hours before';
    case '1d':
      return '1 day before';
    case '2d':
      return '2 days before';
    case 'custom':
      return 'at custom time';
    default:
      return '';
  }
}

/**
 * Schedule a local notification for a task reminder
 * @param task - The task to schedule a reminder for
 * @returns Promise<string | null> - The notification ID or null if not scheduled
 */
export async function scheduleTaskReminder(task: Task): Promise<string | null> {
  try {
    // Don't schedule for completed tasks
    if (task.completed) {
      console.log('Task is completed, not scheduling reminder');
      return null;
    }

    const triggerDate = calculateTriggerTime(task);
    if (!triggerDate) {
      console.log('No valid trigger date for task reminder');
      return null;
    }

    // Calculate seconds until trigger time
    const secondsUntilTrigger = Math.floor((triggerDate.getTime() - Date.now()) / 1000);
    
    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: `Reminder: ${task.type.toUpperCase()}`,
        body: task.description,
        data: { 
          taskId: task.id, 
          type: 'task_reminder',
          className: task.className,
        },
        sound: 'default', // Always play notification sound
        badge: 1,
        color: '#6366F1',
        // @ts-ignore
        channelId: 'task-reminders-v3',
      } as Notifications.NotificationContentInput, // Cast to any to allow channelId on Android if needed, though usually part of content
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: secondsUntilTrigger > 0 ? secondsUntilTrigger : 1,
        repeats: false,
      },
    });

    console.log(`Scheduled notification ${notificationId} for task ${task.id} at ${triggerDate.toLocaleString()}`);
    return notificationId;
  } catch (error) {
    console.error('Error scheduling task reminder:', error);
    return null;
  }
}

/**
 * Schedule a notification for when a task is actually due
 * @param task - The task to schedule a due date notification for
 * @returns Promise<string | null> - The notification ID or null if not scheduled
 */
export async function scheduleDueDateNotification(task: Task): Promise<string | null> {
  try {
    // Don't schedule for completed tasks
    if (task.completed) {
      console.log('Task is completed, not scheduling due date notification');
      return null;
    }

    if (!task.dueDate) {
      console.log('No due date for task, not scheduling due date notification');
      return null;
    }

    const dueDate = new Date(task.dueDate);
    
    // If task has a specific time, use it
    if (task.dueTime) {
      const [hours, minutes] = task.dueTime.split(':');
      dueDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);
    } else {
      // Default to 9 AM if no time specified
      dueDate.setHours(9, 0, 0, 0);
    }

    // Don't schedule if in the past
    if (dueDate <= new Date()) {
      console.log('Due date is in the past, not scheduling due date notification');
      return null;
    }

    // Calculate seconds until due date
    const secondsUntilDue = Math.floor((dueDate.getTime() - Date.now()) / 1000);
    
    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: `Task Due: ${task.type.toUpperCase()}`,
        body: `${task.description}${task.className ? ` (${task.className})` : ''}`,
        data: { 
          taskId: task.id, 
          type: 'task_due',
          className: task.className,
        },
        sound: 'default', // Always play notification sound
        badge: 1,
        color: '#6366F1',
        // @ts-ignore
        channelId: 'task-reminders-v3',
      } as Notifications.NotificationContentInput,
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: secondsUntilDue > 0 ? secondsUntilDue : 1,
        repeats: false,
      },
    });

    console.log(`Scheduled due date notification ${notificationId} for task ${task.id} at ${dueDate.toLocaleString()}`);
    return notificationId;
  } catch (error) {
    console.error('Error scheduling due date notification:', error);
    return null;
  }
}

/**
 * Cancel a specific notification by ID
 * @param notificationId - The notification ID to cancel
 */
export async function cancelNotification(notificationId: string): Promise<void> {
  try {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
    console.log(`Cancelled notification ${notificationId}`);
  } catch (error) {
    console.error('Error cancelling notification:', error);
  }
}

/**
 * Cancel all notifications for a specific task
 * @param taskId - The task ID to cancel notifications for
 */
export async function cancelAllTaskNotifications(taskId: string): Promise<void> {
  try {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    
    for (const notification of scheduled) {
      if (notification.content.data?.taskId === taskId) {
        await Notifications.cancelScheduledNotificationAsync(notification.identifier);
        console.log(`Cancelled notification ${notification.identifier} for task ${taskId}`);
      }
    }
  } catch (error) {
    console.error('Error cancelling task notifications:', error);
  }
}

/**
 * Get all scheduled notifications for debugging
 */
export async function getScheduledNotifications() {
  try {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    console.log('Scheduled notifications:', scheduled);
    return scheduled;
  } catch (error) {
    console.error('Error getting scheduled notifications:', error);
    return [];
  }
}

/**
 * Cancel all scheduled notifications
 */
export async function cancelAllNotifications(): Promise<void> {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
    console.log('Cancelled all scheduled notifications');
  } catch (error) {
    console.error('Error cancelling all notifications:', error);
  }
}

/**
 * Schedule a notification for a goal's due date and time
 * @param goal - The goal to schedule a notification for
 * @returns Promise<string | null> - The notification ID or null if not scheduled
 */
export async function scheduleGoalNotification(goal: Goal): Promise<string | null> {
  try {
    // Don't schedule for completed goals
    if (goal.completed) {
      console.log('Goal is completed, not scheduling notification');
      return null;
    }

    if (!goal.dueDate) {
      console.log('No due date for goal, not scheduling notification');
      return null;
    }

    const dueDate = new Date(goal.dueDate);
    
    // If goal has a specific time, use it
    if (goal.dueTime) {
      const [hours, minutes] = goal.dueTime.split(':');
      dueDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);
    } else {
      // Default to 9 AM if no time specified
      dueDate.setHours(9, 0, 0, 0);
    }

    // Don't schedule if in the past
    if (dueDate <= new Date()) {
      console.log('Goal due date is in the past, not scheduling notification');
      return null;
    }

    // Calculate seconds until due date
    const secondsUntilDue = Math.floor((dueDate.getTime() - Date.now()) / 1000);
    
    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: `Goal Due: ${goal.title}`,
        body: goal.description || 'Your goal is due!',
        data: { 
          goalId: goal.id, 
          type: 'goal_due',
        },
        sound: 'default',
        badge: 1,
        color: '#6366F1',
        // @ts-ignore
        channelId: 'task-reminders-v2',
      } as Notifications.NotificationContentInput,
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: secondsUntilDue > 0 ? secondsUntilDue : 1,
        repeats: false,
      },
    });

    console.log(`Scheduled goal notification ${notificationId} for goal ${goal.id} at ${dueDate.toLocaleString()}`);
    return notificationId;
  } catch (error) {
    console.error('Error scheduling goal notification:', error);
    return null;
  }
}

