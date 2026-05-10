import AsyncStorage from "@react-native-async-storage/async-storage";
import createContextHook from "@nkzw/create-context-hook";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect, useMemo, useCallback } from "react";
import {
	Task,
	Class,
	Goal,
	Note,
	StudyGroup,
	StudyGroupMessage,
} from "@/types";
import { db } from "@/firebaseConfig";
import {
	collection,
	doc,
	addDoc,
	query,
	where,
	onSnapshot,
	orderBy,
	Timestamp,
	deleteDoc,
	updateDoc,
	getDocs,
} from "firebase/firestore";
import { useAuth } from "./AuthContext";
import { useStreak } from "./StreakContext";
import * as calendarSync from "@/utils/calendarSync";
import * as NotificationService from "@/utils/notificationService";
import apiService from "@/utils/apiService";
import { tasksAPI, classesAPI, notesAPI, goalsAPI, studyGroupsAPI } from "@/utils/dataAPI";
import socketService from "@/utils/socketService";
import { offlineQueue } from "@/utils/offlineQueue";
import { Alert, Linking } from "react-native";
import { formatLocalDate, parseLocalDate } from "@/utils/timeUtils";

const STORAGE_KEYS = {
	TASKS: "cause-student-tasks",
	CLASSES: "cause-student-classes",
	GOALS: "cause-student-goals",
	NOTES: "cause-student-notes",
	STUDY_GROUPS: "cause-student-study-groups",
	GROUP_LAST_READ: "cause-student-group-last-read",
	CALENDAR_SYNC_ENABLED: "cause-student-calendar-sync-enabled",
	APP_CALENDAR_ID: "cause-student-app-calendar-id",
};

export const [AppProvider, useApp] = createContextHook(() => {
	const { user } = useAuth(); // Must be first to maintain hook order
	const { refreshStreak } = useStreak();
	const queryClient = useQueryClient();
	const [tasks, setTasks] = useState<Task[]>([]);
	const [classes, setClasses] = useState<Class[]>([]);
	const [goals, setGoals] = useState<Goal[]>([]);
	const [notes, setNotes] = useState<Note[]>([]);
	const [studyGroups, setStudyGroups] = useState<StudyGroup[]>([]);
	const [tasksLoading, setTasksLoading] = useState(false);
	const [initialLoadFailed, setInitialLoadFailed] = useState(false);
	const [isAIConversationActive, setIsAIConversationActive] = useState(false);
	const [classesLoading, setClassesLoading] = useState(false);
	const [goalsLoading, setGoalsLoading] = useState(false);
	const [notesLoading, setNotesLoading] = useState(false);
	const [calendarSyncEnabled, setCalendarSyncEnabled] = useState(false);
	const [appCalendarId, setAppCalendarId] = useState<string | null>(null);
	const [isOnline, setIsOnline] = useState(true);
	const [pendingOperations, setPendingOperations] = useState(0);
	const [groupLastRead, setGroupLastRead] = useState<Record<string, string>>({});
	// Surfaces rollback errors to the UI so users know a save failed
	const [syncError, setSyncError] = useState<string | null>(null);

	const notifySyncError = (message: string) => {
		setSyncError(message);
		setTimeout(() => setSyncError(null), 4000);
	};

	// Video Configuration State
	const [videoConfig, setVideoConfig] = useState({
		homeVideoId: "VRSnKzgVTiU", // Default Home Video
		homeVideoTitle: "Pep Talk - Motivation from students like you", // Default Title
		causesVideoId: "dQw4w9WgXcQ", // Default Causes Video
		causesVideo1Id: "dQw4w9WgXcQ",
		causesVideo2Id: "dQw4w9WgXcQ",
		causesVideo3Id: "dQw4w9WgXcQ",
		causesVideo4Id: "dQw4w9WgXcQ",
		essay1: { title: '', author: '', content: '' },
		essay2: { title: '', author: '', content: '' }
	});

	/**
	 * Retries all queued create operations that failed while the backend was cold.
	 * Keeps temp items visible in state until confirmed by the server, then swaps
	 * the temp ID for the real backend ID.
	 */
	const processOfflineQueue = useCallback(async () => {
		if (!user?.uid) return;
		const pending = offlineQueue.getPendingOperations();
		if (pending.length === 0) return;

		console.log(`[AppContext] Processing ${pending.length} queued operations`);

		for (const operation of pending) {
			if (operation.retryCount >= offlineQueue.getMaxRetries()) {
				await offlineQueue.incrementRetryCount(operation.id);
				continue;
			}
			try {
				if (operation.entity === 'task' && operation.type === 'create') {
					const { tempId, ...taskPayload } = operation.data;
					const newTask = await tasksAPI.createTask(taskPayload);
					if (newTask) {
						setTasks((prev) => {
							const withoutTemp = prev.filter((t) => t.id !== tempId);
							const alreadyExists = withoutTemp.some((t) => t.id === newTask.id);
							return alreadyExists ? withoutTemp : [newTask, ...withoutTemp];
						});
						await offlineQueue.removeFromQueue(operation.id);
						if (taskPayload.reminder && !taskPayload.completed) {
							NotificationService.scheduleTaskReminder(newTask).catch(() => {});
						}
						NotificationService.scheduleDueDateNotification(newTask).catch(() => {});
					}
				} else if (operation.entity === 'class' && operation.type === 'create') {
					const { tempId, ...classPayload } = operation.data;
					const newClass = await classesAPI.createClass(classPayload);
					if (newClass) {
						setClasses((prev) => {
							const withoutTemp = prev.filter((c) => c.id !== tempId);
							const alreadyExists = withoutTemp.some((c) => c.id === newClass.id);
							return alreadyExists ? withoutTemp : [newClass, ...withoutTemp];
						});
						await offlineQueue.removeFromQueue(operation.id);
					}
				} else if (operation.entity === 'goal' && operation.type === 'create') {
					const { tempId, ...goalPayload } = operation.data;
					const newGoal = await goalsAPI.createGoal(goalPayload);
					if (newGoal) {
						setGoals((prev) => {
							const withoutTemp = prev.filter((g) => g.id !== tempId);
							const alreadyExists = withoutTemp.some((g) => g.id === newGoal.id);
							return alreadyExists ? withoutTemp : [newGoal, ...withoutTemp];
						});
						await offlineQueue.removeFromQueue(operation.id);
					}
				} else if (operation.entity === 'note' && operation.type === 'create') {
					const { tempId, ...notePayload } = operation.data;
					const newNote = await notesAPI.createNote(notePayload);
					if (newNote) {
						setNotes((prev) => {
							const withoutTemp = prev.filter((n) => n.id !== tempId);
							const alreadyExists = withoutTemp.some((n) => n.id === newNote.id);
							return alreadyExists ? withoutTemp : [newNote, ...withoutTemp];
						});
						await offlineQueue.removeFromQueue(operation.id);
					}
				}
			} catch (error) {
				const discarded = await offlineQueue.incrementRetryCount(operation.id);
				if (!discarded) {
					console.warn(`[AppContext] Retry failed for queued operation ${operation.id}, will retry later`);
				}
			}
		}

		setPendingOperations(offlineQueue.getPendingCount());
	}, [user?.uid]);

	// Manual refresh function for tasks
	const refreshTasks = useCallback(async (options?: { silent?: boolean }) => {
		if (!user?.uid) return;
		try {
			if (!options?.silent) setTasksLoading(true);
			const tasksData = await tasksAPI.getTasks(user.uid);
			// Preserve any pending optimistic items (temp IDs) so they aren't wiped
			// by the server fetch before the offline queue has been processed.
			setTasks((prev) => {
				const pendingTemps = prev.filter((t) => t.id.startsWith('temp_'));
				const confirmedIds = new Set(tasksData.map((t) => t.id));
				const stillPending = pendingTemps.filter((t) => !confirmedIds.has(t.id));
				return [...stillPending, ...tasksData];
			});
			AsyncStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(tasksData)).catch(e => console.warn('[AppContext] Failed to cache tasks:', e));
			// Backend is confirmed alive — flush any queued creates
			processOfflineQueue();
		} catch (error) {
			console.error("Error loading tasks:", error);
		} finally {
			if (!options?.silent) setTasksLoading(false);
		}
	}, [user?.uid, processOfflineQueue]);

	const syncStoredSurveyAnswers = async () => {
		if (!user?.uid) return;
		try {
			const storedAnswers = await AsyncStorage.getItem('@survey_answers');
			if (storedAnswers) {
				console.log('[AppContext] Found locally saved survey answers. Attempting to sync...');
				const answers = JSON.parse(storedAnswers);

				const response = await apiService.patch('/api/users/purpose', {
					userId: user.uid,
					purpose: answers
				});

				if (response.success || response.message === 'Purpose statement updated successfully') {
					console.log('[AppContext] Successfully synced local survey answers.');
					await AsyncStorage.removeItem('@survey_answers');
					// Refresh goals if possible to maybe trigger updates, though purpose is fetched separately
					refreshGoals();
				} else {
					console.error('[AppContext] Failed to sync local survey answers:', response.error);
				}
			}
		} catch (error) {
			console.error('[AppContext] Error syncing local survey answers:', error);
		}
	};

	const registerPushToken = async () => {
		try {
			const token = await NotificationService.registerForPushNotificationsAsync();
			if (token && user?.uid) {
				console.log("Registering push token using consolidated service...");
				await NotificationService.savePushToken(user.uid, token, user.email || undefined, user.name || undefined);
			}
		} catch (error) {
			console.error("Error registering push token:", error);
		}
	};


	// Manual refresh function for classes
	const refreshClasses = useCallback(async (options?: { silent?: boolean }) => {
		if (!user?.uid) return;
		try {
			if (!options?.silent) setClassesLoading(true);
			const classesData = await classesAPI.getClasses(user.uid);
			const sortedClasses = classesData.sort((a, b) => {
				const dateA = new Date(a.createdAt || 0).getTime();
				const dateB = new Date(b.createdAt || 0).getTime();
				return dateB - dateA;
			});
			setClasses((prev) => {
				const pendingTemps = prev.filter((c) => c.id.startsWith('temp_'));
				const confirmedIds = new Set(sortedClasses.map((c) => c.id));
				const stillPending = pendingTemps.filter((c) => !confirmedIds.has(c.id));
				return [...stillPending, ...sortedClasses];
			});
			AsyncStorage.setItem(STORAGE_KEYS.CLASSES, JSON.stringify(sortedClasses)).catch(e => console.warn('[AppContext] Failed to cache classes:', e));
		} catch (error) {
			console.error("Error loading classes:", error);
		} finally {
			if (!options?.silent) setClassesLoading(false);
		}
	}, [user?.uid]);

	// Manual refresh function for goals
	const refreshGoals = useCallback(async (options?: { silent?: boolean }) => {
		if (!user?.uid) return;
		try {
			if (!options?.silent) setGoalsLoading(true);
			const goalsData = await goalsAPI.getGoals(user.uid);
			const sortedGoals = goalsData.sort((a, b) => {
				const dateA = new Date(a.createdAt || 0).getTime();
				const dateB = new Date(b.createdAt || 0).getTime();
				return dateB - dateA;
			});
			setGoals((prev) => {
				const pendingTemps = prev.filter((g) => g.id.startsWith('temp_'));
				const confirmedIds = new Set(sortedGoals.map((g) => g.id));
				const stillPending = pendingTemps.filter((g) => !confirmedIds.has(g.id));
				return [...stillPending, ...sortedGoals];
			});
			AsyncStorage.setItem(STORAGE_KEYS.GOALS, JSON.stringify(sortedGoals)).catch(e => console.warn('[AppContext] Failed to cache goals:', e));
		} catch (error) {
			console.error("Error loading goals:", error);
		} finally {
			if (!options?.silent) setGoalsLoading(false);
		}
	}, [user?.uid]);

	// Manual refresh function for notes
	const refreshNotes = useCallback(async (options?: { silent?: boolean }) => {
		if (!user?.uid) return;
		try {
			if (!options?.silent) setNotesLoading(true);
			const notesData = await notesAPI.getNotes(user.uid);
			setNotes((prev) => {
				const pendingTemps = prev.filter((n) => n.id.startsWith('temp_'));
				const confirmedIds = new Set(notesData.map((n) => n.id));
				const stillPending = pendingTemps.filter((n) => !confirmedIds.has(n.id));
				return [...stillPending, ...notesData];
			});
			AsyncStorage.setItem(STORAGE_KEYS.NOTES, JSON.stringify(notesData)).catch(e => console.warn('[AppContext] Failed to cache notes:', e));
		} catch (error) {
			console.error("Error loading notes:", error);
		} finally {
			if (!options?.silent) setNotesLoading(false);
		}
	}, [user?.uid]);

	// On login: load all data.
	// Step 1 — instantly hydrate from AsyncStorage cache (makes isLoading go false right away).
	// Step 2 — fetch fresh data from the API in the background (all 4 in parallel).
	useEffect(() => {
		if (!user?.uid) return;

		// Load cached data synchronously so the UI can render immediately
		const loadFromCache = async () => {
			try {
				const [cachedTasks, cachedClasses, cachedGoals, cachedNotes] = await Promise.all([
					AsyncStorage.getItem(STORAGE_KEYS.TASKS),
					AsyncStorage.getItem(STORAGE_KEYS.CLASSES),
					AsyncStorage.getItem(STORAGE_KEYS.GOALS),
					AsyncStorage.getItem(STORAGE_KEYS.NOTES),
				]);
				if (cachedTasks) setTasks(JSON.parse(cachedTasks));
				if (cachedClasses) setClasses(JSON.parse(cachedClasses));
				if (cachedGoals) setGoals(JSON.parse(cachedGoals));
				if (cachedNotes) setNotes(JSON.parse(cachedNotes));
			} catch (e) {
				console.warn('[AppContext] Cache read failed:', e);
			}
		};

		// Fetch fresh data from API — all 4 in parallel, silently (no loading spinners)
		const fetchFresh = async () => {
			try {
				setInitialLoadFailed(false);
				await Promise.all([
					refreshTasks({ silent: true }),
					refreshClasses({ silent: true }),
					refreshGoals({ silent: true }),
					refreshNotes({ silent: true }),
				]);
			} catch (e) {
				console.error('[AppContext] Initial data fetch failed:', e);
				setInitialLoadFailed(true);
			}
		};

		// Fire-and-forget side effects
		registerPushToken();
		syncStoredSurveyAnswers();

		// Load cache first (fast), then refresh from API
		loadFromCache().then(fetchFresh);
	}, [user?.uid]);


	// Video Configuration Listener — retries with exponential backoff on error
	useEffect(() => {
		let retryTimer: ReturnType<typeof setTimeout> | null = null;
		let retryCount = 0;
		let currentUnsub: (() => void) | null = null;

		const subscribe = () => {
			const videoDocRef = doc(db, 'content', 'videos');
			currentUnsub = onSnapshot(videoDocRef, (docSnap) => {
				retryCount = 0;
				if (docSnap.exists()) {
					const data = docSnap.data();
					setVideoConfig({
						homeVideoId: data.homeVideoId || "VRSnKzgVTiU",
						homeVideoTitle: data.homeVideoTitle || "Pep Talk - Motivation from students like you",
						causesVideoId: data.causesVideoId || "dQw4w9WgXcQ",
						causesVideo1Id: data.causesVideo1Id || "dQw4w9WgXcQ",
						causesVideo2Id: data.causesVideo2Id || "dQw4w9WgXcQ",
						causesVideo3Id: data.causesVideo3Id || "dQw4w9WgXcQ",
						causesVideo4Id: data.causesVideo4Id || "dQw4w9WgXcQ",
						essay1: data.essay1 || { title: '', author: '', content: '' },
						essay2: data.essay2 || { title: '', author: '', content: '' }
					});
				}
			}, (error) => {
				console.error('[AppContext] Video config listener error, will retry:', error);
				retryCount++;
				const delay = Math.min(1000 * Math.pow(2, retryCount), 30000);
				retryTimer = setTimeout(subscribe, delay);
			});
		};

		subscribe();

		return () => {
			currentUnsub?.();
			if (retryTimer) clearTimeout(retryTimer);
		};
	}, []);

	// Network status listener
	useEffect(() => {
		const handleNetworkChange = (online: boolean) => {
			setIsOnline(online);
			setPendingOperations(offlineQueue.getPendingCount());

			if (online) {
				console.log('[Network] Back online, processing queued operations');
				processOfflineQueue();
			} else {
				console.log('[Network] Offline mode activated');
			}
		};

		offlineQueue.addNetworkListener(handleNetworkChange);

		return () => {
			offlineQueue.removeNetworkListener(handleNetworkChange);
		};
	}, [processOfflineQueue]);

	// Load calendar sync settings and validate the stored calendar ID is still valid
	useEffect(() => {
		const loadCalendarSettings = async () => {
			try {
				const syncEnabled = await AsyncStorage.getItem(
					STORAGE_KEYS.CALENDAR_SYNC_ENABLED
				);
				const calendarId = await AsyncStorage.getItem(
					STORAGE_KEYS.APP_CALENDAR_ID
				);

				if (syncEnabled === "true") {
					if (calendarId) {
						// Verify the calendar still exists and allows writes (user may
						// have deleted it from the iOS Calendar app)
						const stillValid = await calendarSync.validateCalendarId(calendarId);
						if (stillValid) {
							setCalendarSyncEnabled(true);
							setAppCalendarId(calendarId);
						} else {
							// Calendar gone — reset sync state so next toggle re-creates it
							await AsyncStorage.setItem(STORAGE_KEYS.CALENDAR_SYNC_ENABLED, "false");
							await AsyncStorage.removeItem(STORAGE_KEYS.APP_CALENDAR_ID);
							console.warn("Stored calendar ID is no longer valid, resetting sync state");
						}
					} else {
						setCalendarSyncEnabled(true);
					}
				}
			} catch (error) {
				console.error("Error loading calendar settings:", error);
			}
		};

		loadCalendarSettings();
	}, []);

	// Load last read timestamps
	useEffect(() => {
		const loadLastRead = async () => {
			if (!user?.uid) {
				setGroupLastRead({});
				return;
			}
			try {
				const storageKey = `${STORAGE_KEYS.GROUP_LAST_READ}_${user.uid}`;
				const stored = await AsyncStorage.getItem(storageKey);
				if (stored) {
					setGroupLastRead(JSON.parse(stored));
				} else {
					setGroupLastRead({});
				}
			} catch (error) {
				console.error("Error loading last read timestamps:", error);
			}
		};
		loadLastRead();
	}, [user?.uid]);

	const markGroupAsRead = useCallback(async (groupId: string) => {
		if (!user?.uid) return;
		try {
			const now = new Date().toISOString();
			setGroupLastRead(prev => {
				const updated = { ...prev, [groupId]: now };
				const storageKey = `${STORAGE_KEYS.GROUP_LAST_READ}_${user.uid}`;
				AsyncStorage.setItem(storageKey, JSON.stringify(updated));
				return updated;
			});
		} catch (error) {
			console.error("Error saving last read timestamp:", error);
		}
	}, [user?.uid]);

	const unreadCountMapping = useMemo(() => {
		const mapping: Record<string, number> = {};
		studyGroups.forEach(group => {
			const lastRead = groupLastRead[group.id] || "1970-01-01T00:00:00.000Z";
			const unreadMessages = (group.messages || []).filter(msg => {
				if (user?.email && msg.senderEmail === user.email) return false;
				return msg.createdAt > lastRead;
			});
			mapping[group.id] = unreadMessages.length;
		});
		return mapping;
	}, [studyGroups, groupLastRead, user?.email]);

	const totalUnreadCount = useMemo(() => {
		return Object.values(unreadCountMapping).reduce((acc, count) => acc + count, 0);
	}, [unreadCountMapping]);

	const addTask = async (task: Task) => {
		if (!user?.uid) return;

		// 1. Add optimistically with a temp ID so the UI shows it instantly
		const tempId = `temp_${Date.now()}_${Math.random().toString(36).slice(2)}`;
		const optimisticTask: Task = { ...task, id: tempId };
		setTasks((prev) => [optimisticTask, ...prev]);

		try {
			let calendarEventId: string | undefined;
			if (calendarSyncEnabled && appCalendarId && !task.completed) {
				const eventId = await calendarSync.syncTaskToCalendar(task, appCalendarId);
				if (eventId) calendarEventId = eventId;
			}

			// 2. Sync to backend in background
			const newTask = await tasksAPI.createTask({
				userId: user.uid,
				description: task.description,
				type: task.type,
				className: task.className,
				dueDate: task.dueDate,
				dueTime: task.dueTime,
				priority: task.priority,
				reminder: task.reminder,
				customReminderDate: task.customReminderDate || undefined,
				alarmEnabled: task.alarmEnabled,
				completed: task.completed,
				createdAt: task.createdAt,
				calendarEventId: calendarEventId || undefined,
				repeat: task.repeat || 'none',
			} as any);

			if (newTask) {
				// 3. Swap temp item for real item (guard against WS race)
				setTasks((prev) => {
					const withoutTemp = prev.filter((t) => t.id !== tempId);
					const alreadyExists = withoutTemp.some((t) => t.id === newTask.id);
					return alreadyExists ? withoutTemp : [newTask, ...withoutTemp];
				});

				// 4. Schedule notifications with the real backend ID
				if (task.reminder && !task.completed) {
					await NotificationService.scheduleTaskReminder(newTask);
				}
				if (!task.completed) {
					await NotificationService.scheduleDueDateNotification(newTask);
				}
			} else {
				// Backend not ready — keep the task visible and queue for retry
				await offlineQueue.addToQueue({ type: 'create', entity: 'task', data: { userId: user.uid, description: task.description, type: task.type, className: task.className, dueDate: task.dueDate, dueTime: task.dueTime, priority: task.priority, reminder: task.reminder, customReminderDate: task.customReminderDate || undefined, alarmEnabled: task.alarmEnabled, completed: task.completed, createdAt: task.createdAt, calendarEventId: undefined, repeat: task.repeat || 'none', tempId } });
				setPendingOperations(offlineQueue.getPendingCount());
				notifySyncError("Saving in background — will sync when server is ready.");
			}
		} catch (error) {
			console.error("Error adding task:", error);
			// Keep the optimistic item visible and queue it for retry when backend recovers
			await offlineQueue.addToQueue({ type: 'create', entity: 'task', data: { userId: user.uid, description: task.description, type: task.type, className: task.className, dueDate: task.dueDate, dueTime: task.dueTime, priority: task.priority, reminder: task.reminder, customReminderDate: task.customReminderDate || undefined, alarmEnabled: task.alarmEnabled, completed: task.completed, createdAt: task.createdAt, calendarEventId: undefined, repeat: task.repeat || 'none', tempId } });
			setPendingOperations(offlineQueue.getPendingCount());
			notifySyncError("Saving in background — will sync when server is ready.");
		}
	};

	const updateTask = async (id: string, updates: Partial<Task>) => {
		if (!user?.uid) return;

		// Validate task ID
		if (!id || id === 'undefined' || id === 'null') {
			console.error('Invalid task ID provided to updateTask:', id);
			return;
		}

		try {
			// Find the task to get its calendar event ID
			const task = tasks.find((t) => t.id === id);
			if (!task) {
				console.error('Task not found with ID:', id);
				return;
			}

			// Cancel existing notifications for this task
			await NotificationService.cancelAllTaskNotifications(id);

			// Update calendar event if synced
			if (calendarSyncEnabled && task?.calendarEventId) {
				const updatedTask = { ...task, ...updates };
				await calendarSync.updateCalendarEvent(
					task.calendarEventId,
					updatedTask as Task
				);
			}

			// Handle daily repeating tasks — let completion fire normally so streaks/points
			// update correctly, then spawn a fresh occurrence for tomorrow.
			let dailyNextDate: string | null = null;
			if (updates.completed === true && task.repeat === 'daily') {
				const nextDay = parseLocalDate(task.dueDate);
				nextDay.setDate(nextDay.getDate() + 1);
				dailyNextDate = formatLocalDate(nextDay);
				console.log(`[AppContext] Daily task "${task.description}" completed. Will spawn next occurrence for ${dailyNextDate}.`);
			}

			// Update local state immediately (Optimistic Update)
			setTasks((prev) =>
				prev.map((t) => (t.id === id ? { ...t, ...updates } : t))
			);

			// Update via API
			const success = await tasksAPI.updateTask(id, updates);

			if (success) {
				const updatedTask = { ...task, ...updates } as Task;
				// Reschedule if not completed
				if (!updatedTask.completed) {
					if (updatedTask.reminder) {
						await NotificationService.scheduleTaskReminder(updatedTask);
					}
					await NotificationService.scheduleDueDateNotification(updatedTask);
				} else {
					// If completed, refresh streaks to update the UI
					refreshStreak();
					// Spawn tomorrow's occurrence for daily repeating tasks
					if (dailyNextDate) {
						try {
							const nextTask = await tasksAPI.createTask({
								userId: user.uid,
								description: task.description,
								type: task.type,
								className: task.className,
								dueDate: dailyNextDate,
								dueTime: task.dueTime,
								priority: task.priority,
								reminder: task.reminder,
								customReminderDate: task.customReminderDate || undefined,
								alarmEnabled: task.alarmEnabled,
								completed: false,
								createdAt: new Date().toISOString(),
								repeat: 'daily',
							} as any);
							if (nextTask) {
								setTasks(prev => [nextTask, ...prev]);
								if (nextTask.reminder) NotificationService.scheduleTaskReminder(nextTask).catch(() => {});
								NotificationService.scheduleDueDateNotification(nextTask).catch(() => {});
							}
						} catch (e) {
							console.error('[AppContext] Failed to create next daily task occurrence:', e);
						}
					}
				}
			} else {
				// Rollback on failure (optional, but good practice)
				refreshTasks();
			}
		} catch (error) {
			console.error("Error updating task:", error);
		}
	};

	const deleteTask = async (id: string) => {
		if (!user?.uid) return;

		const task = tasks.find((t) => t.id === id);

		// Remove immediately (optimistic)
		setTasks((prev) => prev.filter((t) => t.id !== id));

		try {
			// Cancel all notifications for this task
			await NotificationService.cancelAllTaskNotifications(id);

			// Delete calendar event if synced
			if (task?.calendarEventId) {
				await calendarSync.deleteCalendarEvent(task.calendarEventId);
			}

			// Delete via API
			const success = await tasksAPI.deleteTask(id);

			if (!success && task) {
				// Rollback on failure
				setTasks((prev) => [task, ...prev]);
			}
		} catch (error) {
			console.error("Error deleting task:", error);
			if (task) setTasks((prev) => [task, ...prev]);
			notifySyncError("Couldn't delete task. Please try again.");
		}
	};

	const addClass = async (cls: Class) => {
		if (!user?.uid) return;

		// Add optimistically with a temp ID so the UI shows it instantly
		const tempId = `temp_${Date.now()}_${Math.random().toString(36).slice(2)}`;
		const optimisticClass: Class = { ...cls, id: tempId };
		setClasses((prev) => [optimisticClass, ...prev]);

		try {
			let calendarEventId: string | undefined;

			// Sync to calendar if enabled
			if (calendarSyncEnabled && appCalendarId) {
				const eventId = await calendarSync.syncClassToCalendar(cls, appCalendarId);
				if (eventId) calendarEventId = eventId;
			}

			// Create class via API
			const newClass = await classesAPI.createClass({
				userId: user.uid,
				name: cls.name,
				section: cls.section,
				daysOfWeek: cls.daysOfWeek,
				time: cls.time,
				professor: cls.professor,
				startDate: cls.startDate,
				endDate: cls.endDate,
				color: cls.color,
				createdAt: cls.createdAt,
				calendarEventId: calendarEventId || undefined,
			} as any);

			if (newClass) {
				// Swap temp item for real item (guard against WS race)
				setClasses((prev) => {
					const withoutTemp = prev.filter((c) => c.id !== tempId);
					const alreadyExists = withoutTemp.some((c) => c.id === newClass.id);
					return alreadyExists ? withoutTemp : [newClass, ...withoutTemp];
				});
			} else {
				// Backend not ready — keep the class visible and queue for retry
				await offlineQueue.addToQueue({ type: 'create', entity: 'class', data: { userId: user.uid, name: cls.name, section: cls.section, daysOfWeek: cls.daysOfWeek, time: cls.time, professor: cls.professor, startDate: cls.startDate, endDate: cls.endDate, color: cls.color, createdAt: cls.createdAt, calendarEventId: undefined, tempId } });
				setPendingOperations(offlineQueue.getPendingCount());
				notifySyncError("Saving in background — will sync when server is ready.");
			}
		} catch (error) {
			console.error("Error adding class:", error);
			// Keep the optimistic item visible and queue it for retry when backend recovers
			await offlineQueue.addToQueue({ type: 'create', entity: 'class', data: { userId: user.uid, name: cls.name, section: cls.section, daysOfWeek: cls.daysOfWeek, time: cls.time, professor: cls.professor, startDate: cls.startDate, endDate: cls.endDate, color: cls.color, createdAt: cls.createdAt, calendarEventId: undefined, tempId } });
			setPendingOperations(offlineQueue.getPendingCount());
			notifySyncError("Saving in background — will sync when server is ready.");
		}
	};

	const updateClass = async (id: string, updates: Partial<Class>) => {
		if (!user?.uid) return;

		const original = classes.find((c) => c.id === id);

		// Update state immediately (optimistic)
		setClasses((prev) => prev.map((c) => (c.id === id ? { ...c, ...updates } : c)));

		try {
			// Update calendar event if synced
			if (calendarSyncEnabled && original?.calendarEventId) {
				const updatedClass = { ...original, ...updates };
				await calendarSync.updateClassEvent(original.calendarEventId, updatedClass as Class);
			}

			// Update via API
			const success = await classesAPI.updateClass(id, updates);

			if (!success && original) {
				// Rollback on failure
				setClasses((prev) => prev.map((c) => (c.id === id ? original : c)));
			}
		} catch (error) {
			console.error("Error updating class:", error);
			if (original) setClasses((prev) => prev.map((c) => (c.id === id ? original : c)));
			notifySyncError("Couldn't update class. Please try again.");
		}
	};

	const deleteClass = async (id: string) => {
		if (!user?.uid) return;

		const cls = classes.find((c) => c.id === id);

		// Remove immediately (optimistic)
		setClasses((prev) => prev.filter((c) => c.id !== id));

		try {
			// Delete calendar event if synced
			if (cls?.calendarEventId) {
				await calendarSync.deleteCalendarEvent(cls.calendarEventId);
			}

			// Delete via API
			const success = await classesAPI.deleteClass(id);

			if (!success && cls) {
				setClasses((prev) => [cls, ...prev]);
			}
		} catch (error) {
			console.error("Error deleting class:", error);
			if (cls) setClasses((prev) => [cls, ...prev]);
			notifySyncError("Couldn't delete class. Please try again.");
		}
	};

	const addGoal = async (goal: Goal) => {
		if (!user?.uid) return;

		// Add optimistically with a temp ID so the UI shows it instantly
		const tempId = `temp_${Date.now()}_${Math.random().toString(36).slice(2)}`;
		const optimisticGoal: Goal = { ...goal, id: tempId };
		setGoals((prev) => [optimisticGoal, ...prev]);

		try {
			const newGoal = await goalsAPI.createGoal({
				userId: user.uid,
				title: goal.title,
				description: goal.description || "",
				dueDate: goal.dueDate || "",
				dueTime: goal.dueTime,
				completed: goal.completed,
				notificationId: goal.notificationId,
				createdAt: goal.createdAt,
				habits: goal.habits || [],
			} as any);

			if (newGoal) {
				// Swap temp item for real item (guard against WS race)
				setGoals((prev) => {
					const withoutTemp = prev.filter((g) => g.id !== tempId);
					const alreadyExists = withoutTemp.some((g) => g.id === newGoal.id);
					return alreadyExists ? withoutTemp : [newGoal, ...withoutTemp];
				});
			} else {
				// Backend not ready — keep the goal visible and queue for retry
				await offlineQueue.addToQueue({ type: 'create', entity: 'goal', data: { userId: user.uid, title: goal.title, description: goal.description || '', dueDate: goal.dueDate || '', dueTime: goal.dueTime, completed: goal.completed, notificationId: goal.notificationId, createdAt: goal.createdAt, habits: goal.habits || [], tempId } });
				setPendingOperations(offlineQueue.getPendingCount());
				notifySyncError("Saving in background — will sync when server is ready.");
			}
		} catch (error) {
			console.error("Error adding goal:", error);
			// Keep the optimistic item visible and queue it for retry when backend recovers
			await offlineQueue.addToQueue({ type: 'create', entity: 'goal', data: { userId: user.uid, title: goal.title, description: goal.description || '', dueDate: goal.dueDate || '', dueTime: goal.dueTime, completed: goal.completed, notificationId: goal.notificationId, createdAt: goal.createdAt, habits: goal.habits || [], tempId } });
			setPendingOperations(offlineQueue.getPendingCount());
			notifySyncError("Saving in background — will sync when server is ready.");
		}
	};

	const updateGoal = async (id: string, updates: Partial<Goal>) => {
		if (!user?.uid) return;

		const original = goals.find((g) => g.id === id);

		// Update state immediately (optimistic)
		setGoals((prev) => prev.map((g) => (g.id === id ? { ...g, ...updates } : g)));

		try {
			const success = await goalsAPI.updateGoal(id, updates);

			if (success) {
				if (updates.completed === true) {
					refreshStreak();
				}
			} else if (original) {
				// Rollback on failure
				setGoals((prev) => prev.map((g) => (g.id === id ? original : g)));
			}
		} catch (error) {
			console.error("Error updating goal:", error);
			if (original) setGoals((prev) => prev.map((g) => (g.id === id ? original : g)));
			notifySyncError("Couldn't update goal. Please try again.");
		}
	};

	const deleteGoal = async (id: string) => {
		if (!user?.uid) return;

		const goal = goals.find((g) => g.id === id);

		// Remove immediately (optimistic)
		setGoals((prev) => prev.filter((g) => g.id !== id));

		try {
			const success = await goalsAPI.deleteGoal(id);

			if (!success && goal) {
				setGoals((prev) => [goal, ...prev]);
			}
		} catch (error) {
			console.error("Error deleting goal:", error);
			if (goal) setGoals((prev) => [goal, ...prev]);
			notifySyncError("Couldn't delete goal. Please try again.");
		}
	};

	const addNote = async (note: Omit<Note, "id">) => {
		if (!user?.uid) return;

		// Add optimistically with a temp ID so the UI shows it instantly
		const tempId = `temp_${Date.now()}_${Math.random().toString(36).slice(2)}`;
		const now = new Date().toISOString();
		const optimisticNote: Note = { ...note, id: tempId, createdAt: now, updatedAt: now } as Note;
		setNotes((prev) => [optimisticNote, ...prev]);

		try {
			const newNote = await notesAPI.createNote({
				userId: user.uid,
				title: note.title,
				className: note.className || "",
				content: note.content,
				createdAt: now,
				updatedAt: now,
			} as any);

			if (newNote) {
				// Swap temp item for real item (guard against WS race)
				setNotes((prev) => {
					const withoutTemp = prev.filter((n) => n.id !== tempId);
					const alreadyExists = withoutTemp.some((n) => n.id === newNote.id);
					return alreadyExists ? withoutTemp : [newNote, ...withoutTemp];
				});
			} else {
				// Backend not ready — keep the note visible and queue for retry
				await offlineQueue.addToQueue({ type: 'create', entity: 'note', data: { userId: user.uid, title: note.title, className: note.className || '', content: note.content, createdAt: now, updatedAt: now, tempId } });
				setPendingOperations(offlineQueue.getPendingCount());
				notifySyncError("Saving in background — will sync when server is ready.");
			}
		} catch (error) {
			console.error("Error adding note:", error);
			// Keep the optimistic item visible and queue it for retry when backend recovers
			await offlineQueue.addToQueue({ type: 'create', entity: 'note', data: { userId: user.uid, title: note.title, className: note.className || '', content: note.content, createdAt: now, updatedAt: now, tempId } });
			setPendingOperations(offlineQueue.getPendingCount());
			notifySyncError("Saving in background — will sync when server is ready.");
		}
	};

	const updateNote = async (id: string, updates: Partial<Note>) => {
		if (!user?.uid) return;

		const original = notes.find((n) => n.id === id);
		const now = new Date().toISOString();

		// Update state immediately (optimistic)
		setNotes((prev) => prev.map((n) => (n.id === id ? { ...n, ...updates, updatedAt: now } : n)));

		try {
			const success = await notesAPI.updateNote(id, { ...updates, updatedAt: now });

			if (!success && original) {
				setNotes((prev) => prev.map((n) => (n.id === id ? original : n)));
			}
		} catch (error) {
			console.error("Error updating note:", error);
			if (original) setNotes((prev) => prev.map((n) => (n.id === id ? original : n)));
			notifySyncError("Couldn't update note. Please try again.");
		}
	};

	const deleteNote = async (id: string) => {
		if (!user?.uid) return;

		const note = notes.find((n) => n.id === id);

		// Remove immediately (optimistic)
		setNotes((prev) => prev.filter((n) => n.id !== id));

		try {
			const success = await notesAPI.deleteNote(id);

			if (!success && note) {
				setNotes((prev) => [note, ...prev]);
			}
		} catch (error) {
			console.error("Error deleting note:", error);
			if (note) setNotes((prev) => [note, ...prev]);
			notifySyncError("Couldn't delete note. Please try again.");
		}
	};

	// Manual refresh function for study groups
	const refreshStudyGroups = useCallback(async () => {
		if (!user?.uid || !user?.email) return;
		try {
			const groupsData = await studyGroupsAPI.getStudyGroups(user.uid, user.email);
			setStudyGroups(groupsData);

			// Join rooms for all fetched groups
			groupsData.forEach(group => {
				console.log(`[AppContext] Joining group room: ${group.id}`);
				socketService.joinGroup(group.id);
			});
		} catch (error) {
			console.error("Error loading study groups:", error);
		}
	}, [user?.uid, user?.email]);

	// WebSocket-based study groups with real-time updates
	useEffect(() => {
		if (!user?.uid || !user?.email) {
			socketService.disconnect();
			setStudyGroups([]);
			return;
		}

		// Initial load
		refreshStudyGroups();

		// Connect to WebSocket
		socketService.connect(user.uid);

		// Set up event listeners
		const handleGroupCreated = (data: any) => {
			console.log('Group created event:', data);
			if (data.group) {
				// Only add group if current user is a member or creator
				const isCreator = data.group.creatorId === user.uid;
				const isMember = data.group.members?.some((m: any) => m.email === user.email);

				if (!isCreator && !isMember) {
					console.log('User is not a member of this group, not adding to list');
					return;
				}

				const newGroup = {
					id: data.group.id || data.group._id,
					name: data.group.name,
					className: data.group.className,
					school: data.group.school,
					description: data.group.description,
					code: data.group.code,
					creatorId: data.group.creatorId,
					isPrivate: data.group.isPrivate,
					admins: data.group.admins || [],
					members: data.group.members,
					pendingMembers: data.group.pendingMembers || [],
					messages: data.group.messages || [],
					createdAt: data.group.createdAt,
				};
				setStudyGroups((prev) => {
					const exists = prev.some(g => g.id === newGroup.id);
					return exists ? prev : [newGroup, ...prev];
				});
				// Join the new group room
				socketService.joinGroup(newGroup.id);
			}
		};

		const handleGroupJoined = (data: any) => {
			console.log('Group joined event via user channel:', data);
			if (data.group) {
				setStudyGroups((prev) => {
					// Avoid duplicates
					if (prev.some(g => g.id === data.group._id)) return prev;
					// Ensure we have a correctly formatted group object
					const newGroup = {
						...data.group,
						id: data.group._id || data.group.id
					};
					return [...prev, newGroup];
				});
				// Join the room for the new group
				socketService.joinGroup(data.group._id);
			}
		};

		const handleMemberJoined = (data: any) => {
			console.log('Member joined event:', data);
			setStudyGroups((prev) =>
				prev.map((g) =>
					g.id === data.groupId
						? { ...g, members: data.members }
						: g
				)
			);
		};

		const handleNewMessage = (data: any) => {
			console.log('New message event:', data);
			setStudyGroups((prev) =>
				prev.map((g) => {
					if (g.id === data.groupId) {
						// Check if there's a temporary message to replace
						const hasTemp = g.messages?.some(m => m.id.startsWith('temp-'));
						if (hasTemp) {
							// Replace the temporary message with the real one
							return {
								...g,
								messages: [
									...(g.messages || []).filter(m => !m.id.startsWith('temp-')),
									data.message
								]
							};
						}
						// No temp message, just add the new one
						return { ...g, messages: [...(g.messages || []), data.message] };
					}
					return g;
				})
			);
		};

		const handlePendingRequest = (data: any) => {
			console.log('Pending request event:', data);
			setStudyGroups((prev) =>
				prev.map(g => {
					if (g.id === data.groupId) {
						// Avoid duplicates
						const exists = g.pendingMembers?.some(p => p.email === data.pendingMember.email);
						if (exists) return g;

						return {
							...g,
							pendingMembers: [...(g.pendingMembers || []), data.pendingMember]
						};
					}
					return g;
				})
			);
		};

		const handleMemberApproved = (data: any) => {
			console.log('Member approved event:', data);
			setStudyGroups((prev) =>
				prev.map((g) => {
					if (g.id === data.groupId) {
						// Remove from pending
						const newPending = (g.pendingMembers || []).filter(p => p.email !== data.member.email);

						// Add to members (avoid duplicates)
						const memberExists = g.members?.some(m => m.email === data.member.email);
						const newMembers = memberExists
							? g.members
							: [...(g.members || []), { ...data.member, joinedAt: new Date(), userId: data.member.userId || '' }];

						return {
							...g,
							pendingMembers: newPending,
							members: newMembers,
						};
					}
					return g;
				})
			);
		};

		const handleMemberRejected = (data: any) => {
			console.log('Member rejected event:', data);
			setStudyGroups((prev) =>
				prev.map((g) => {
					if (g.id === data.groupId) {
						return {
							...g,
							pendingMembers: (g.pendingMembers || []).filter(p => p.email !== data.email)
						};
					}
					return g;
				})
			);
		};

		const handleGroupDeleted = (data: any) => {
			console.log('Group deleted event:', data);
			setStudyGroups((prev) => prev.filter((g) => g.id !== data.groupId));
		};

		const handleMemberKicked = (data: any) => {
			console.log('Member kicked event:', data);
			setStudyGroups((prev) =>
				prev.map((g) => {
					if (g.id === data.groupId) {
						// If the current user was kicked, remove the group entirely
						if (data.email === user.email) {
							return null as any;
						}
						return {
							...g,
							members: g.members.filter((m) => m.email !== data.email),
						};
					}
					return g;
				}).filter(Boolean)
			);
		};

		const handleAdminPromoted = (data: any) => {
			console.log('Admin promoted event:', data);
			setStudyGroups((prev) =>
				prev.map((g) => {
					if (g.id === data.groupId) {
						const alreadyAdmin = g.admins?.includes(data.userId);
						return {
							...g,
							admins: alreadyAdmin ? g.admins : [...(g.admins || []), data.userId],
						};
					}
					return g;
				})
			);
		};

		const handleAdminDemoted = (data: any) => {
			console.log('Admin demoted event:', data);
			setStudyGroups((prev) =>
				prev.map((g) => {
					if (g.id === data.groupId) {
						return {
							...g,
							admins: (g.admins || []).filter((id) => id !== data.userId),
						};
					}
					return g;
				})
			);
		};

		// Task event handlers
		const handleTaskCreated = (data: any) => {
			if (data.userId === user.uid && data.task) {
				setTasks((prev) => {
					const exists = prev.some(t => t.id === data.task.id);
					return exists ? prev : [data.task, ...prev];
				});
			}
		};

		const handleTaskUpdated = (data: any) => {
			if (data.userId === user.uid && data.task) {
				setTasks((prev) =>
					prev.map((t) => (t.id === data.task.id ? data.task : t))
				);
			}
		};

		const handleTaskDeleted = (data: any) => {
			if (data.userId === user.uid) {
				setTasks((prev) => prev.filter((t) => t.id !== data.taskId));
			}
		};

		// Class event handlers
		const handleClassCreated = (data: any) => {
			if (data.userId === user.uid && data.class) {
				setClasses((prev) => {
					const exists = prev.some(c => c.id === data.class.id);
					return exists ? prev : [data.class, ...prev];
				});
			}
		};

		const handleClassUpdated = (data: any) => {
			if (data.userId === user.uid && data.class) {
				setClasses((prev) =>
					prev.map((c) => (c.id === data.class.id ? data.class : c))
				);
			}
		};

		const handleClassDeleted = (data: any) => {
			if (data.userId === user.uid) {
				setClasses((prev) => prev.filter((c) => c.id !== data.classId));
			}
		};

		// Note event handlers
		const handleNoteCreated = (data: any) => {
			if (data.userId === user.uid && data.note) {
				setNotes((prev) => {
					const exists = prev.some(n => n.id === data.note.id);
					return exists ? prev : [data.note, ...prev];
				});
			}
		};

		const handleNoteUpdated = (data: any) => {
			if (data.userId === user.uid && data.note) {
				setNotes((prev) =>
					prev.map((n) => (n.id === data.note.id ? data.note : n))
				);
			}
		};

		const handleNoteDeleted = (data: any) => {
			if (data.userId === user.uid) {
				setNotes((prev) => prev.filter((n) => n.id !== data.noteId));
			}
		};

		// Goal event handlers
		const handleGoalCreated = (data: any) => {
			if (data.userId === user.uid && data.goal) {
				setGoals((prev) => {
					const exists = prev.some(g => g.id === data.goal.id);
					return exists ? prev : [data.goal, ...prev];
				});
			}
		};

		const handleGoalUpdated = (data: any) => {
			if (data.userId === user.uid && data.goal) {
				setGoals((prev) =>
					prev.map((g) => (g.id === data.goal.id ? data.goal : g))
				);
			}
		};

		const handleGoalDeleted = (data: any) => {
			if (data.userId === user.uid) {
				setGoals((prev) => prev.filter((g) => g.id !== data.goalId));
			}
		};

		// Register all event listeners
		// Study Groups (Only real-time feature)
		socketService.on('group-created', handleGroupCreated);
		socketService.on('member-joined', handleMemberJoined);
		socketService.on('new-message', handleNewMessage);
		socketService.on('group-deleted', handleGroupDeleted);
		socketService.on('pending-request', handlePendingRequest);
		socketService.on('member-approved', handleMemberApproved);
		socketService.on('member-rejected', handleMemberRejected);
		socketService.on('group-joined', handleGroupJoined);
		socketService.on('member-kicked', handleMemberKicked);
		socketService.on('admin-promoted', handleAdminPromoted);
		socketService.on('admin-demoted', handleAdminDemoted);

		return () => {
			// Clean up all event listeners
			// Tasks
			socketService.off('task-created', handleTaskCreated);
			socketService.off('task-updated', handleTaskUpdated);
			socketService.off('task-deleted', handleTaskDeleted);

			// Classes
			socketService.off('class-created', handleClassCreated);
			socketService.off('class-updated', handleClassUpdated);
			socketService.off('class-deleted', handleClassDeleted);

			// Notes
			socketService.off('note-created', handleNoteCreated);
			socketService.off('note-updated', handleNoteUpdated);
			socketService.off('note-deleted', handleNoteDeleted);

			// Goals
			socketService.off('goal-created', handleGoalCreated);
			socketService.off('goal-updated', handleGoalUpdated);
			socketService.off('goal-deleted', handleGoalDeleted);

			// Study Groups
			socketService.off('group-created', handleGroupCreated);
			socketService.off('member-joined', handleMemberJoined);
			socketService.off('new-message', handleNewMessage);
			socketService.off('group-deleted', handleGroupDeleted);
			socketService.off('pending-request', handlePendingRequest);
			socketService.off('member-approved', handleMemberApproved);
			socketService.off('member-rejected', handleMemberRejected);
			socketService.off('group-joined', handleGroupJoined);
			socketService.off('member-kicked', handleMemberKicked);
			socketService.off('admin-promoted', handleAdminPromoted);
			socketService.off('admin-demoted', handleAdminDemoted);

			socketService.disconnect();
		};
	}, [user?.uid, user?.email]);

	const createStudyGroup = useCallback(async (
		group: Omit<
			StudyGroup,
			"id" | "code" | "members" | "messages" | "createdAt" | "creatorId" | "admins" | "pendingMembers"
		>
	) => {
		if (!user?.uid || !user?.email) return null;

		try {
			console.log('[AppContext] Attempting to create study group:', group.name);
			const newGroup = await studyGroupsAPI.createStudyGroup({
				name: group.name,
				className: group.className,
				school: group.school,
				description: group.description,
				creatorId: user.uid,
				creatorEmail: user.email,
				creatorName: user.name || user.email.split('@')[0],
				isPrivate: group.isPrivate,
			});

			if (newGroup) {
				console.log('[AppContext] Study group created successfully:', newGroup.id);
				refreshStreak();

				return {
					...newGroup,
					messages: newGroup.messages || [],
				} as StudyGroup;
			}
			console.warn('[AppContext] Backend returned null for new study group');
			return null;
		} catch (error) {
			console.error("[AppContext] Error creating study group:", error);
			return null;
		}
	}, [user?.uid, user?.email, user?.name, refreshStreak]);

	const joinStudyGroup = useCallback(async (code: string, email: string, name: string) => {
		if (!user?.uid) return null;

		try {
			const result = await studyGroupsAPI.joinStudyGroup(code, email, name, user.uid);

			if (result) {
				// Check if it's a pending status
				if (result.status === 'pending') {
					return {
						status: 'pending',
						message: result.message,
					};
				}

				// Otherwise it's a joined status
				const group = result;
				// Update local state
				setStudyGroups((prev) => {
					const exists = prev.some(g => g.id === group.id);
					if (exists) {
						return prev.map(g => g.id === group.id ? { ...group, messages: group.messages || [] } : g);
					}
					return [{ ...group, messages: group.messages || [] }, ...prev];
				});

				// Refresh streaks to show new points
				refreshStreak();

				return {
					status: 'joined',
					...group,
					messages: group.messages || [],
				} as StudyGroup & { status: string };
			}
			return null;
		} catch (error) {
			console.error("Error joining study group:", error);
			return null;
		}
	}, [user?.uid, refreshStreak]);

	const sendGroupMessage = useCallback(async (
		groupId: string,
		senderEmail: string,
		message: string,
		attachments?: { name: string; uri: string; type: string }[]
	) => {
		if (!user?.uid) return;

		try {
			// Upload attachments if any
			let finalAttachments = attachments || [];

			if (finalAttachments.length > 0) {
				const uploadResult = await apiService.uploadFiles(finalAttachments);

				if (uploadResult.success && uploadResult.files) {
					finalAttachments = uploadResult.files.map((file: any) => ({
						name: file.name,
						uri: file.url,
						type: file.type,
					}));
				}
			}

			// Optimistic UI update - add message immediately
			const tempMessage = {
				id: `temp-${Date.now()}`,
				groupId,
				senderEmail,
				senderName: user.name || user.email?.split('@')[0] || '',
				message,
				attachments: finalAttachments,
				createdAt: new Date().toISOString(),
			};

			setStudyGroups((prev) =>
				prev.map((g) =>
					g.id === groupId
						? { ...g, messages: [...(g.messages || []), tempMessage] }
						: g
				)
			);

			await studyGroupsAPI.sendMessage(groupId, {
				senderEmail,
				senderName: user.name || user.email?.split('@')[0] || '',
				message,
				attachments: finalAttachments,
			});

			// Don't refresh groups here - the WebSocket event will handle updating with real message ID
		} catch (error) {
			console.error("Error sending group message:", error);
			// Remove the optimistic message on error
			setStudyGroups((prev) =>
				prev.map((g) =>
					g.id === groupId
						? { ...g, messages: (g.messages || []).filter(m => !m.id.startsWith('temp-')) }
						: g
				)
			);
		}
	}, [user?.uid, user?.name, user?.email]);

	const deleteStudyGroup = useCallback(async (id: string) => {
		if (!user?.uid) return;

		try {
			const success = await studyGroupsAPI.deleteStudyGroup(id);
			if (success) {
				setStudyGroups((prev) => prev.filter((g) => g.id !== id));
			}
		} catch (error) {
			console.error("Error deleting study group:", error);
		}
	}, [user?.uid]);

	const sortedTasks = useMemo(() => {
		return [...tasks].sort((a, b) => {
			const dateA = new Date(a.createdAt).getTime();
			const dateB = new Date(b.createdAt).getTime();
			return dateB - dateA; // Newest first
		});
	}, [tasks]);

	// Toggle calendar sync
	const toggleCalendarSync = async (enabled: boolean) => {
		try {
			if (enabled) {
				// Check / request permissions
				const permissionResult = await calendarSync.requestCalendarPermissions();

				if (permissionResult === 'blocked') {
					// User previously denied — OS won't show the prompt again on iOS
					Alert.alert(
						'Calendar Access Blocked',
						'Cause Planner needs calendar access to sync your tasks and classes. Please enable it in Settings.',
						[
							{ text: 'Not Now', style: 'cancel' },
							{ text: 'Open Settings', onPress: () => Linking.openSettings() },
						]
					);
					return false;
				}

				if (permissionResult === 'denied') {
					Alert.alert(
						'Calendar Access Denied',
						'Calendar permission is required to sync your schedule. Please allow access when prompted.'
					);
					return false;
				}

				// Get or create the app calendar
				const calendarId = await calendarSync.getOrCreateAppCalendar();
				if (!calendarId) {
					Alert.alert(
						'Calendar Setup Failed',
						'Could not create a Cause Planner calendar on your device. Please check that your device has at least one active calendar account in Settings → Calendar → Accounts.'
					);
					return false;
				}

				setAppCalendarId(calendarId);
				await AsyncStorage.setItem(STORAGE_KEYS.APP_CALENDAR_ID, calendarId);

				// Bulk sync existing tasks
				const syncedTasks = await calendarSync.bulkSyncTasks(tasks, calendarId);
				for (const [taskId, eventId] of syncedTasks.entries()) {
					await updateTask(taskId, { calendarEventId: eventId });
				}

				// Bulk sync existing classes
				const syncedClasses = await calendarSync.bulkSyncClasses(classes, calendarId);
				for (const [classId, eventId] of syncedClasses.entries()) {
					await updateClass(classId, { calendarEventId: eventId });
				}
			}

			setCalendarSyncEnabled(enabled);
			await AsyncStorage.setItem(
				STORAGE_KEYS.CALENDAR_SYNC_ENABLED,
				enabled.toString()
			);
			return true;
		} catch (error) {
			console.error("Error toggling calendar sync:", error);
			Alert.alert(
				'Sync Error',
				'Something went wrong while setting up calendar sync. Please try again.'
			);
			return false;
		}
	};

	// Sync all tasks to calendar (manual sync)
	const syncAllTasksToCalendar = async () => {
		if (!appCalendarId) return;

		try {
			const syncedTasks = await calendarSync.bulkSyncTasks(
				tasks,
				appCalendarId
			);

			// Update tasks with calendar event IDs
			for (const [taskId, eventId] of syncedTasks.entries()) {
				await updateTask(taskId, { calendarEventId: eventId });
			}

			return syncedTasks.size;
		} catch (error) {
			console.error("Error syncing all tasks:", error);
			return 0;
		}
	};

	return {
		tasks,
		classes,
		goals,
		notes,
		studyGroups,
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
		createStudyGroup,
		joinStudyGroup,
		sendGroupMessage,
		deleteStudyGroup,
		calendarSyncEnabled,
		toggleCalendarSync,
		syncAllTasksToCalendar,
		refreshTasks,
		refreshClasses,
		refreshNotes,
		refreshGoals,
		refreshStudyGroups,
		refreshAllData: async (options?: { silent?: boolean }) => {
			try {
				await Promise.all([
					refreshTasks(options),
					refreshClasses(options),
					refreshNotes(options),
					refreshGoals(options),
					refreshStudyGroups(),
				]);
			} catch (e) {
				console.error('[AppContext] refreshAllData failed:', e);
			}
		},
		isLoading: tasksLoading || classesLoading || goalsLoading || notesLoading,
		videoConfig,
		isOnline,
		pendingOperations,
		syncError,
		totalUnreadCount,
		markGroupAsRead,
		groupLastRead,
		unreadCountMapping,
		isAIConversationActive,
		setIsAIConversationActive,
		initialLoadFailed,
		retryInitialLoad: async () => {
			try {
				setInitialLoadFailed(false);
				await Promise.all([
					refreshTasks({ silent: true }),
					refreshClasses({ silent: true }),
					refreshGoals({ silent: true }),
					refreshNotes({ silent: true }),
				]);
			} catch (e) {
				console.error('[AppContext] Retry failed:', e);
				setInitialLoadFailed(true);
			}
		},
	};
});

