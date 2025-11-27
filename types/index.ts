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
}

export interface Goal {
  id: string;
  title: string;
  description?: string;
  dueDate?: string;
  completed: boolean;
  habits: Habit[];
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
