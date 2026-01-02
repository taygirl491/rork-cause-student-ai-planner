export type TaskType = 'task' | 'event' | 'exam' | 'paper' | 'appointment' | 'homework';
export type Priority = 'low' | 'medium' | 'high';
export type ReminderTime = '1h' | '2h' | '1d' | '2d' | 'custom';

export interface Task {
  id: string;
  description: string;
  type: TaskType;
  className?: string;
  dueDate: string;
  dueTime?: string;
  repeat?: string;
  priority: Priority;
  reminder?: ReminderTime;
  customReminderDate?: string;
  alarmEnabled: boolean;
  alarmDates?: string[];
  completed: boolean;
  createdAt: string;
  calendarEventId?: string; // ID of the synced calendar event
}

export interface Class {
  id: string;
  name: string;
  section?: string;
  daysOfWeek: string[];
  time: string;
  professor?: string;
  startDate: string;
  endDate: string;
  color: string;
  createdAt: string;
  calendarEventId?: string; // ID of the synced calendar event
}

export interface Goal {
  id: string;
  title: string;
  description?: string;
  dueDate?: string;
  dueTime?: string;
  completed: boolean;
  notificationId?: string;
  createdAt: string;
}

export interface Habit {
  id: string;
  title: string;
  dueDate?: string;
  dueTime?: string;
  completed: boolean;
}

export interface Note {
  id: string;
  title: string;
  className?: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export interface StudyGroupMessage {
  id: string;
  groupId: string;
  senderEmail: string;
  message: string;
  attachments?: { name: string; uri: string; type: string }[];
  createdAt: string;
}

export interface PendingMember {
  email: string;
  name?: string;
  userId: string;
  requestedAt: string;
}

export interface StudyGroup {
  id: string;
  name: string;
  className: string;
  school: string;
  description: string;
  code?: string; // Optional - hidden for private groups where user is not creator/admin
  creatorId: string;
  isPrivate?: boolean;
  admins: string[]; // Array of user IDs with admin privileges (max 4)
  members: { email: string; name?: string; userId: string; joinedAt: string }[];
  pendingMembers: PendingMember[]; // Users awaiting approval
  messages: StudyGroupMessage[];
  createdAt: string;
}

export interface AIMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
}

export interface AIConversation {
  id: string;
  messages: AIMessage[];
  createdAt: string;
  updatedAt: string;
}
