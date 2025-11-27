import AsyncStorage from '@react-native-async-storage/async-storage';
import createContextHook from '@nkzw/create-context-hook';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useEffect, useMemo } from 'react';
import { Task, Class, Goal, Note } from '@/types';

const STORAGE_KEYS = {
  TASKS: 'cause-student-tasks',
  CLASSES: 'cause-student-classes',
  GOALS: 'cause-student-goals',
  NOTES: 'cause-student-notes',
};

export const [AppProvider, useApp] = createContextHook(() => {
  const queryClient = useQueryClient();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);

  const tasksQuery = useQuery({
    queryKey: ['tasks'],
    queryFn: async () => {
      const stored = await AsyncStorage.getItem(STORAGE_KEYS.TASKS);
      return stored ? JSON.parse(stored) : [];
    },
  });

  const classesQuery = useQuery({
    queryKey: ['classes'],
    queryFn: async () => {
      const stored = await AsyncStorage.getItem(STORAGE_KEYS.CLASSES);
      return stored ? JSON.parse(stored) : [];
    },
  });

  const goalsQuery = useQuery({
    queryKey: ['goals'],
    queryFn: async () => {
      const stored = await AsyncStorage.getItem(STORAGE_KEYS.GOALS);
      return stored ? JSON.parse(stored) : [];
    },
  });

  const notesQuery = useQuery({
    queryKey: ['notes'],
    queryFn: async () => {
      const stored = await AsyncStorage.getItem(STORAGE_KEYS.NOTES);
      return stored ? JSON.parse(stored) : [];
    },
  });

  useEffect(() => {
    if (tasksQuery.data) {
      setTasks(tasksQuery.data);
    }
  }, [tasksQuery.data]);

  useEffect(() => {
    if (classesQuery.data) {
      setClasses(classesQuery.data);
    }
  }, [classesQuery.data]);

  useEffect(() => {
    if (goalsQuery.data) {
      setGoals(goalsQuery.data);
    }
  }, [goalsQuery.data]);

  useEffect(() => {
    if (notesQuery.data) {
      setNotes(notesQuery.data);
    }
  }, [notesQuery.data]);

  const syncTasksMutation = useMutation({
    mutationFn: async (newTasks: Task[]) => {
      await AsyncStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(newTasks));
      return newTasks;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });

  const syncClassesMutation = useMutation({
    mutationFn: async (newClasses: Class[]) => {
      await AsyncStorage.setItem(STORAGE_KEYS.CLASSES, JSON.stringify(newClasses));
      return newClasses;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['classes'] });
    },
  });

  const syncGoalsMutation = useMutation({
    mutationFn: async (newGoals: Goal[]) => {
      await AsyncStorage.setItem(STORAGE_KEYS.GOALS, JSON.stringify(newGoals));
      return newGoals;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] });
    },
  });

  const syncNotesMutation = useMutation({
    mutationFn: async (newNotes: Note[]) => {
      await AsyncStorage.setItem(STORAGE_KEYS.NOTES, JSON.stringify(newNotes));
      return newNotes;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes'] });
    },
  });

  const addTask = (task: Task) => {
    const updated = [...tasks, task];
    setTasks(updated);
    syncTasksMutation.mutate(updated);
  };

  const updateTask = (id: string, updates: Partial<Task>) => {
    const updated = tasks.map(t => t.id === id ? { ...t, ...updates } : t);
    setTasks(updated);
    syncTasksMutation.mutate(updated);
  };

  const deleteTask = (id: string) => {
    const updated = tasks.filter(t => t.id !== id);
    setTasks(updated);
    syncTasksMutation.mutate(updated);
  };

  const addClass = (cls: Class) => {
    const updated = [...classes, cls];
    setClasses(updated);
    syncClassesMutation.mutate(updated);
  };

  const updateClass = (id: string, updates: Partial<Class>) => {
    const updated = classes.map(c => c.id === id ? { ...c, ...updates } : c);
    setClasses(updated);
    syncClassesMutation.mutate(updated);
  };

  const deleteClass = (id: string) => {
    const updated = classes.filter(c => c.id !== id);
    setClasses(updated);
    syncClassesMutation.mutate(updated);
  };

  const addGoal = (goal: Goal) => {
    const updated = [...goals, goal];
    setGoals(updated);
    syncGoalsMutation.mutate(updated);
  };

  const updateGoal = (id: string, updates: Partial<Goal>) => {
    const updated = goals.map(g => g.id === id ? { ...g, ...updates } : g);
    setGoals(updated);
    syncGoalsMutation.mutate(updated);
  };

  const deleteGoal = (id: string) => {
    const updated = goals.filter(g => g.id !== id);
    setGoals(updated);
    syncGoalsMutation.mutate(updated);
  };

  const addNote = (note: Note) => {
    const updated = [...notes, note];
    setNotes(updated);
    syncNotesMutation.mutate(updated);
  };

  const updateNote = (id: string, updates: Partial<Note>) => {
    const updated = notes.map(n => n.id === id ? { ...n, ...updates } : n);
    setNotes(updated);
    syncNotesMutation.mutate(updated);
  };

  const deleteNote = (id: string) => {
    const updated = notes.filter(n => n.id !== id);
    setNotes(updated);
    syncNotesMutation.mutate(updated);
  };

  const sortedTasks = useMemo(() => {
    return [...tasks].sort((a, b) => {
      const dateA = new Date(a.dueDate + (a.dueTime ? ` ${a.dueTime}` : '')).getTime();
      const dateB = new Date(b.dueDate + (b.dueTime ? ` ${b.dueTime}` : '')).getTime();
      return dateA - dateB;
    });
  }, [tasks]);

  return {
    tasks,
    classes,
    goals,
    notes,
    sortedTasks,
    addTask,
    updateTask,
    deleteTask,
    addClass,
    updateClass,
    deleteClass,
    addGoal,
    updateGoal,
    deleteGoal,
    addNote,
    updateNote,
    deleteNote,
    isLoading: tasksQuery.isLoading || classesQuery.isLoading || goalsQuery.isLoading || notesQuery.isLoading,
  };
});
