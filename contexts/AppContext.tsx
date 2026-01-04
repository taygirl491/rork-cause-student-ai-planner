import AsyncStorage from "@react-native-async-storage/async-storage";
import createContextHook from "@nkzw/create-context-hook";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect, useMemo } from "react";
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
import * as calendarSync from "@/utils/calendarSync";
import * as NotificationService from "@/utils/notificationService";
import apiService from "@/utils/apiService";
import { tasksAPI, classesAPI, notesAPI, goalsAPI, studyGroupsAPI } from "@/utils/dataAPI";
import socketService from "@/utils/socketService";
import { offlineQueue } from "@/utils/offlineQueue";

const STORAGE_KEYS = {
	TASKS: "cause-student-tasks",
	CLASSES: "cause-student-classes",

	NOTES: "cause-student-notes",
	STUDY_GROUPS: "cause-student-study-groups",
	CALENDAR_SYNC_ENABLED: "cause-student-calendar-sync-enabled",
	APP_CALENDAR_ID: "cause-student-app-calendar-id",
};

export const [AppProvider, useApp] = createContextHook(() => {
	const { user } = useAuth(); // Must be first to maintain hook order
	const queryClient = useQueryClient();
	const [tasks, setTasks] = useState<Task[]>([]);
	const [classes, setClasses] = useState<Class[]>([]);
	const [goals, setGoals] = useState<Goal[]>([]);
	const [notes, setNotes] = useState<Note[]>([]);
	const [studyGroups, setStudyGroups] = useState<StudyGroup[]>([]);
	const [tasksLoading, setTasksLoading] = useState(false);
	const [classesLoading, setClassesLoading] = useState(false);
	const [goalsLoading, setGoalsLoading] = useState(false);
	const [notesLoading, setNotesLoading] = useState(false);
	const [calendarSyncEnabled, setCalendarSyncEnabled] = useState(false);
	const [appCalendarId, setAppCalendarId] = useState<string | null>(null);
	const [isOnline, setIsOnline] = useState(true);
	const [pendingOperations, setPendingOperations] = useState(0);

	// Video Configuration State
	const [videoConfig, setVideoConfig] = useState({
		homeVideoId: "VRSnKzgVTiU", // Default Home Video
		causesVideoId: "dQw4w9WgXcQ", // Default Causes Video
		causesVideo1Id: "dQw4w9WgXcQ",
		causesVideo2Id: "dQw4w9WgXcQ",
		causesVideo3Id: "dQw4w9WgXcQ",
		causesVideo4Id: "dQw4w9WgXcQ",
		essay1: { title: '', author: '', content: '' },
		essay2: { title: '', author: '', content: '' }
	});

	// Manual refresh function for tasks
	const refreshTasks = async () => {
		if (!user?.uid) return;
		try {
			const tasksData = await tasksAPI.getTasks(user.uid);
			setTasks(tasksData);
		} catch (error) {
			console.error("Error loading tasks:", error);
		}
	};

	// Auto-load tasks when user logs in
	useEffect(() => {
		if (user?.uid) {
			refreshTasks();
		}
	}, [user?.uid]);


	// Manual refresh function for classes
	const refreshClasses = async () => {
		if (!user?.uid) return;
		try {
			const classesData = await classesAPI.getClasses(user.uid);
			// Sort by createdAt descending (newest first)
			const sortedClasses = classesData.sort((a, b) => {
				const dateA = new Date(a.createdAt || 0).getTime();
				const dateB = new Date(b.createdAt || 0).getTime();
				return dateB - dateA;
			});
			setClasses(sortedClasses);
		} catch (error) {
			console.error("Error loading classes:", error);
		}
	};

	// Auto-load classes when user logs in
	useEffect(() => {
		if (user?.uid) {
			refreshClasses();
		}
	}, [user?.uid]);



	// Manual refresh function for goals
	const refreshGoals = async () => {
		if (!user?.uid) return;
		try {
			const goalsData = await goalsAPI.getGoals(user.uid);
			// Sort by createdAt descending (newest first)
			const sortedGoals = goalsData.sort((a, b) => {
				const dateA = new Date(a.createdAt || 0).getTime();
				const dateB = new Date(b.createdAt || 0).getTime();
				return dateB - dateA;
			});
			setGoals(sortedGoals);
		} catch (error) {
			console.error("Error loading goals:", error);
		}
	};

	// Auto-load goals when user logs in
	useEffect(() => {
		if (user?.uid) {
			refreshGoals();
		}
	}, [user?.uid]);


	// Manual refresh function for notes
	const refreshNotes = async () => {
		if (!user?.uid) return;
		try {
			const notesData = await notesAPI.getNotes(user.uid);
			setNotes(notesData);
		} catch (error) {
			console.error("Error loading notes:", error);
		}
	};

	// Auto-load notes when user logs in
	useEffect(() => {
		if (user?.uid) {
			refreshNotes();
		}
	}, [user?.uid]);


	// Video Configuration Listener
	useEffect(() => {
		const videoDocRef = doc(db, 'content', 'videos');
		const unsubscribe = onSnapshot(videoDocRef, (docSnap) => {
			if (docSnap.exists()) {
				const data = docSnap.data();
				setVideoConfig({
					homeVideoId: data.homeVideoId || "VRSnKzgVTiU",
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
			console.error("Error listening to video config:", error);
		});

		return () => unsubscribe();
	}, []);

	// Network status listener
	useEffect(() => {
		const handleNetworkChange = (online: boolean) => {
			setIsOnline(online);
			setPendingOperations(offlineQueue.getPendingCount());

			if (online) {
				console.log('[Network] Back online, processing queued operations');
				offlineQueue.processQueue();
			} else {
				console.log('[Network] Offline mode activated');
			}
		};

		offlineQueue.addNetworkListener(handleNetworkChange);

		return () => {
			offlineQueue.removeNetworkListener(handleNetworkChange);
		};
	}, []);

	const tasksQuery = useQuery({
		queryKey: ["tasks"],
		queryFn: async () => {
			const stored = await AsyncStorage.getItem(STORAGE_KEYS.TASKS);
			return stored ? JSON.parse(stored) : [];
		},
		enabled: false, // Disabled since we're using Firestore listener
	});

	const classesQuery = useQuery({
		queryKey: ["classes"],
		queryFn: async () => {
			const stored = await AsyncStorage.getItem(STORAGE_KEYS.CLASSES);
			return stored ? JSON.parse(stored) : [];
		},
		enabled: false, // Disabled since we're using Firestore listener
	});

	// Load calendar sync settings
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
					setCalendarSyncEnabled(true);
				}
				if (calendarId) {
					setAppCalendarId(calendarId);
				}
			} catch (error) {
				console.error("Error loading calendar settings:", error);
			}
		};

		loadCalendarSettings();
	}, []);

	const addTask = async (task: Task) => {
		if (!user?.uid) return;

		try {
			let calendarEventId: string | undefined;

			// Sync to calendar if enabled
			if (calendarSyncEnabled && appCalendarId && !task.completed) {
				const eventId = await calendarSync.syncTaskToCalendar(
					task,
					appCalendarId
				);
				if (eventId) {
					calendarEventId = eventId;
				}
			}

			// Create task via API
			const newTask = await tasksAPI.createTask({
				userId: user.uid,
				description: task.description,
				type: task.type,
				className: task.className,
				dueDate: task.dueDate,
				dueTime: task.dueTime,
				priority: task.priority,
				reminder: task.reminder,
				customReminderDate: task.customReminderDate || null,
				alarmEnabled: task.alarmEnabled,
				completed: task.completed,
				createdAt: task.createdAt,
				calendarEventId: calendarEventId || null,
			});

			if (newTask) {
				// Schedule notification if reminder is set and task is not completed
				if (task.reminder && !task.completed) {
					await NotificationService.scheduleTaskReminder(newTask);
				}

				// Schedule due date notification if task is not completed
				if (!task.completed) {
					await NotificationService.scheduleDueDateNotification(newTask);
				}

				// Don't add to state here - the WebSocket event will handle it
				// This prevents duplicate tasks
			}
		} catch (error) {
			console.error("Error adding task:", error);
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

			// Update via API
			const success = await tasksAPI.updateTask(id, updates);

			if (success) {
				// Reschedule notification if task is not completed and has reminder
				const updatedTask = { ...task, ...updates } as Task;
				if (updatedTask.reminder && !updatedTask.completed) {
					console.log(`[AppContext] Rescheduling reminder for uncrossed task: ${updatedTask.id}`);
					await NotificationService.scheduleTaskReminder(updatedTask);
				}

				// Reschedule due date notification if task is not completed
				if (!updatedTask.completed) {
					await NotificationService.scheduleDueDateNotification(updatedTask);
				}

				// Update local state immediately
				setTasks((prev) =>
					prev.map((t) => (t.id === id ? { ...t, ...updates } : t))
				);
			}
		} catch (error) {
			console.error("Error updating task:", error);
		}
	};

	const deleteTask = async (id: string) => {
		if (!user?.uid) return;

		try {
			// Find the task to get its calendar event ID
			const task = tasks.find((t) => t.id === id);

			// Cancel all notifications for this task
			await NotificationService.cancelAllTaskNotifications(id);

			// Delete calendar event if synced
			if (task?.calendarEventId) {
				await calendarSync.deleteCalendarEvent(task.calendarEventId);
			}

			// Delete via API
			const success = await tasksAPI.deleteTask(id);

			if (success) {
				// Update local state immediately
				setTasks((prev) => prev.filter((t) => t.id !== id));
			}
		} catch (error) {
			console.error("Error deleting task:", error);
		}
	};

	const addClass = async (cls: Class) => {
		if (!user?.uid) return;

		try {
			let calendarEventId: string | undefined;

			// Sync to calendar if enabled
			if (calendarSyncEnabled && appCalendarId) {
				const eventId = await calendarSync.syncClassToCalendar(
					cls,
					appCalendarId
				);
				if (eventId) {
					calendarEventId = eventId;
				}
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
				calendarEventId: calendarEventId || null,
			});

			// Don't add to state here - the WebSocket event will handle it
			// This prevents duplicate classes
		} catch (error) {
			console.error("Error adding class:", error);
		}
	};

	const updateClass = async (id: string, updates: Partial<Class>) => {
		if (!user?.uid) return;

		try {
			// Find the class to get its calendar event ID
			const cls = classes.find((c) => c.id === id);

			// Update calendar event if synced
			if (calendarSyncEnabled && cls?.calendarEventId) {
				const updatedClass = { ...cls, ...updates };
				await calendarSync.updateClassEvent(
					cls.calendarEventId,
					updatedClass as Class
				);
			}

			// Update via API
			const success = await classesAPI.updateClass(id, updates);

			if (success) {
				setClasses((prev) =>
					prev.map((c) => (c.id === id ? { ...c, ...updates } : c))
				);
			}
		} catch (error) {
			console.error("Error updating class:", error);
		}
	};

	const deleteClass = async (id: string) => {
		if (!user?.uid) return;

		try {
			// Find the class to get its calendar event ID
			const cls = classes.find((c) => c.id === id);

			// Delete calendar event if synced
			if (cls?.calendarEventId) {
				await calendarSync.deleteCalendarEvent(cls.calendarEventId);
			}

			// Delete via API
			const success = await classesAPI.deleteClass(id);

			if (success) {
				setClasses((prev) => prev.filter((c) => c.id !== id));
			}
		} catch (error) {
			console.error("Error deleting class:", error);
		}
	};

	const addGoal = async (goal: Goal) => {
		if (!user?.uid) return;

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
			});

			// Don't add to state here - the WebSocket event will handle it
			// This prevents duplicate goals
		} catch (error) {
			console.error("Error adding goal:", error);
		}
	};

	const updateGoal = async (id: string, updates: Partial<Goal>) => {
		if (!user?.uid) return;

		try {
			const success = await goalsAPI.updateGoal(id, updates);

			if (success) {
				setGoals((prev) =>
					prev.map((g) => (g.id === id ? { ...g, ...updates } : g))
				);
			}
		} catch (error) {
			console.error("Error updating goal:", error);
		}
	};

	const deleteGoal = async (id: string) => {
		if (!user?.uid) return;

		try {
			const success = await goalsAPI.deleteGoal(id);

			if (success) {
				setGoals((prev) => prev.filter((g) => g.id !== id));
			}
		} catch (error) {
			console.error("Error deleting goal:", error);
		}
	};

	const addNote = async (note: Omit<Note, "id">) => {
		if (!user?.uid) return;

		try {
			const newNote = await notesAPI.createNote({
				userId: user.uid,
				title: note.title,
				className: note.className || "",
				content: note.content,
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString(),
			});

			// Don't add to state here - the WebSocket event will handle it
			// This prevents duplicate notes
		} catch (error) {
			console.error("Error adding note:", error);
		}
	};

	const updateNote = async (id: string, updates: Partial<Note>) => {
		if (!user?.uid) return;

		try {
			const success = await notesAPI.updateNote(id, {
				...updates,
				updatedAt: new Date().toISOString(),
			});

			if (success) {
				setNotes((prev) =>
					prev.map((n) => (n.id === id ? { ...n, ...updates, updatedAt: new Date().toISOString() } : n))
				);
			}
		} catch (error) {
			console.error("Error updating note:", error);
		}
	};

	const deleteNote = async (id: string) => {
		if (!user?.uid) return;

		try {
			const success = await notesAPI.deleteNote(id);

			if (success) {
				setNotes((prev) => prev.filter((n) => n.id !== id));
			}
		} catch (error) {
			console.error("Error deleting note:", error);
		}
	};

	// Manual refresh function for study groups
	const refreshStudyGroups = async () => {
		if (!user?.uid || !user?.email) return;
		try {
			const groupsData = await studyGroupsAPI.getStudyGroups(user.uid, user.email);
			setStudyGroups(groupsData);
		} catch (error) {
			console.error("Error loading study groups:", error);
		}
	};

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

		const handleGroupDeleted = (data: any) => {
			console.log('Group deleted event:', data);
			setStudyGroups((prev) => prev.filter((g) => g.id !== data.groupId));
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

		// Join all group rooms after groups are loaded
		const joinGroupRooms = () => {
			// Use the groups from state (already loaded by refreshStudyGroups)
			studyGroups.forEach(group => {
				console.log(`Joining group room: ${group.id}`);
				socketService.joinGroup(group.id);
			});
		};

		// Wait a bit for groups to load, then join rooms
		setTimeout(() => {
			joinGroupRooms();
		}, 1000);

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

			socketService.disconnect();
		};
	}, [user?.uid, user?.email]);

	const createStudyGroup = async (
		group: Omit<
			StudyGroup,
			"id" | "code" | "members" | "messages" | "createdAt"
		>
	) => {
		if (!user?.uid || !user?.email) return null;

		try {
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
				// Don't add to state here - the WebSocket event will handle it
				// This prevents duplicate groups
				return {
					...newGroup,
					messages: newGroup.messages || [],
				} as StudyGroup;
			}
			return null;
		} catch (error) {
			console.error("Error creating study group:", error);
			return null;
		}
	};

	const joinStudyGroup = async (code: string, email: string, name: string) => {
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
	};

	const sendGroupMessage = async (
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
	};

	const deleteStudyGroup = async (id: string) => {
		if (!user?.uid) return;

		try {
			const success = await studyGroupsAPI.deleteStudyGroup(id);
			if (success) {
				setStudyGroups((prev) => prev.filter((g) => g.id !== id));
			}
		} catch (error) {
			console.error("Error deleting study group:", error);
		}
	};

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
				// Request permissions
				const hasPermission = await calendarSync.requestCalendarPermissions();
				if (!hasPermission) {
					console.error("Calendar permissions denied");
					return false;
				}

				// Get or create calendar
				const calendarId = await calendarSync.getOrCreateAppCalendar();
				if (!calendarId) {
					console.error("Failed to create calendar");
					return false;
				}

				setAppCalendarId(calendarId);
				await AsyncStorage.setItem(STORAGE_KEYS.APP_CALENDAR_ID, calendarId);

				// Bulk sync existing tasks
				const syncedTasks = await calendarSync.bulkSyncTasks(tasks, calendarId);

				// Update tasks with calendar event IDs
				for (const [taskId, eventId] of syncedTasks.entries()) {
					await updateTask(taskId, { calendarEventId: eventId });
				}

				// Bulk sync existing classes
				const syncedClasses = await calendarSync.bulkSyncClasses(
					classes,
					calendarId
				);

				// Update classes with calendar event IDs
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
		isLoading: tasksLoading || classesLoading || goalsLoading || notesLoading,
		videoConfig,
	};
});

