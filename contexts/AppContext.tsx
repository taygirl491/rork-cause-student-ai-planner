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
	updateDoc,
	deleteDoc,
	query,
	where,
	onSnapshot,
	orderBy,
	Timestamp,
	getDocs,
} from "firebase/firestore";
import { useAuth } from "./AuthContext";
import * as calendarSync from "@/utils/calendarSync";
import apiService from "@/utils/apiService";

const STORAGE_KEYS = {
	TASKS: "cause-student-tasks",
	CLASSES: "cause-student-classes",
	GOALS: "cause-student-goals",
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
	const [tasksLoading, setTasksLoading] = useState(true);
	const [classesLoading, setClassesLoading] = useState(true);
	const [calendarSyncEnabled, setCalendarSyncEnabled] = useState(false);
	const [appCalendarId, setAppCalendarId] = useState<string | null>(null);

	// Real-time Firestore listener for tasks
	useEffect(() => {
		if (!user?.uid) {
			setTasks([]);
			setTasksLoading(false);
			return;
		}

		const tasksRef = collection(db, "tasks");
		const q = query(
			tasksRef,
			where("userId", "==", user.uid),
			orderBy("createdAt", "desc")
		);

		const unsubscribe = onSnapshot(
			q,
			(snapshot) => {
				const tasksData: Task[] = [];
				snapshot.forEach((doc) => {
					const data = doc.data();
					tasksData.push({
						id: doc.id,
						description: data.description,
						type: data.type,
						className: data.className,
						dueDate: data.dueDate,
						dueTime: data.dueTime,
						priority: data.priority,
						reminder: data.reminder,
						alarmEnabled: data.alarmEnabled,
						completed: data.completed,
						createdAt: data.createdAt,
					});
				});
				setTasks(tasksData);
				setTasksLoading(false);
			},
			(error) => {
				console.error("Firestore listener error:", error);
				setTasksLoading(false);
			}
		);

		return () => unsubscribe();
	}, [user?.uid]);

	// Real-time Firestore listener for classes
	useEffect(() => {
		if (!user?.uid) {
			setClasses([]);
			setClassesLoading(false);
			return;
		}

		const classesRef = collection(db, "classes");
		const q = query(
			classesRef,
			where("userId", "==", user.uid),
			orderBy("createdAt", "desc")
		);

		const unsubscribe = onSnapshot(
			q,
			(snapshot) => {
				const classesData: Class[] = [];
				snapshot.forEach((doc) => {
					const data = doc.data();
					classesData.push({
						id: doc.id,
						name: data.name,
						section: data.section,
						daysOfWeek: data.daysOfWeek,
						time: data.time,
						professor: data.professor,
						startDate: data.startDate,
						endDate: data.endDate,
						color: data.color,
						createdAt: data.createdAt,
						calendarEventId: data.calendarEventId,
					});
				});
				setClasses(classesData);
				setClassesLoading(false);
			},
			(error) => {
				console.error("Firestore classes listener error:", error);
				setClassesLoading(false);
			}
		);

		return () => unsubscribe();
	}, [user?.uid]);

	// Real-time Firestore listener for study groups
	useEffect(() => {
		if (!user?.uid || !user?.email) {
			setStudyGroups([]);
			return;
		}

		const studyGroupsRef = collection(db, "studyGroups");
		const q = query(studyGroupsRef, orderBy("createdAt", "desc"));

		const unsubscribe = onSnapshot(
			q,
			(snapshot) => {
				const groupsData: StudyGroup[] = [];
				const messageUnsubscribers: (() => void)[] = [];

				snapshot.forEach((groupDoc) => {
					const data = groupDoc.data();
					// Filter client-side for now since array-contains query requires index
					const isMember = data.members?.some(
						(m: any) => m.email === user.email
					);
					const isCreator = data.creatorId === user.uid;

					if (isMember || isCreator) {
						// Initialize group with empty messages
						const group: StudyGroup = {
							id: groupDoc.id,
							name: data.name,
							className: data.className || "",
							school: data.school || "",
							description: data.description,
							code: data.code,
							members: data.members || [],
							messages: [],
							createdAt:
								data.createdAt?.toDate?.()?.toISOString() ||
								new Date().toISOString(),
						};

						groupsData.push(group);

						// Set up real-time listener for this group's messages
						const messagesRef = collection(
							db,
							"studyGroups",
							groupDoc.id,
							"messages"
						);
						const messagesQuery = query(
							messagesRef,
							orderBy("createdAt", "asc")
						);

						const messageUnsubscribe = onSnapshot(
							messagesQuery,
							(messagesSnapshot) => {
								const messages: StudyGroupMessage[] = [];
								messagesSnapshot.forEach((messageDoc) => {
									const msgData = messageDoc.data();
									messages.push({
										id: messageDoc.id,
										groupId: groupDoc.id,
										senderEmail: msgData.senderEmail,
										message: msgData.message,
										attachments: msgData.attachments || [],
										createdAt:
											msgData.createdAt?.toDate?.()?.toISOString() ||
											new Date().toISOString(),
									});
								});

								// Update the specific group's messages
								setStudyGroups((prev) =>
									prev.map((g) =>
										g.id === groupDoc.id ? { ...g, messages } : g
									)
								);
							}
						);

						messageUnsubscribers.push(messageUnsubscribe);
					}
				});

				setStudyGroups(groupsData);

				// Clean up message listeners when groups change
				return () => {
					messageUnsubscribers.forEach((unsub) => unsub());
				};
			},
			(error) => {
				console.error("Firestore study groups listener error:", error);
			}
		);

		return () => unsubscribe();
	}, [user?.uid, user?.email]);

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

	const goalsQuery = useQuery({
		queryKey: ["goals"],
		queryFn: async () => {
			const stored = await AsyncStorage.getItem(STORAGE_KEYS.GOALS);
			return stored ? JSON.parse(stored) : [];
		},
	});

	const notesQuery = useQuery({
		queryKey: ["notes"],
		queryFn: async () => {
			const stored = await AsyncStorage.getItem(STORAGE_KEYS.NOTES);
			return stored ? JSON.parse(stored) : [];
		},
	});

	// Removed: tasks are now managed by Firestore listener

	// Removed: classes are now managed by Firestore listener

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

	// Removed: study groups now managed by Firestore listener

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

	// Removed: syncTasksMutation (Firestore handles persistence)

	// Removed: syncClassesMutation (Firestore handles persistence)

	const syncGoalsMutation = useMutation({
		mutationFn: async (newGoals: Goal[]) => {
			await AsyncStorage.setItem(STORAGE_KEYS.GOALS, JSON.stringify(newGoals));
			return newGoals;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["goals"] });
		},
	});

	const syncNotesMutation = useMutation({
		mutationFn: async (newNotes: Note[]) => {
			await AsyncStorage.setItem(STORAGE_KEYS.NOTES, JSON.stringify(newNotes));
			return newNotes;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["notes"] });
		},
	});

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

			const tasksRef = collection(db, "tasks");
			await addDoc(tasksRef, {
				userId: user.uid,
				description: task.description,
				type: task.type,
				className: task.className,
				dueDate: task.dueDate,
				dueTime: task.dueTime,
				priority: task.priority,
				reminder: task.reminder,
				alarmEnabled: task.alarmEnabled,
				completed: task.completed,
				createdAt: task.createdAt,
				calendarEventId: calendarEventId || null,
			});
		} catch (error) {
			console.error("Error adding task:", error);
		}
	};

	const updateTask = async (id: string, updates: Partial<Task>) => {
		if (!user?.uid) return;

		try {
			// Find the task to get its calendar event ID
			const task = tasks.find((t) => t.id === id);

			// Update calendar event if synced
			if (calendarSyncEnabled && task?.calendarEventId) {
				const updatedTask = { ...task, ...updates };
				await calendarSync.updateCalendarEvent(
					task.calendarEventId,
					updatedTask as Task
				);
			}

			const taskRef = doc(db, "tasks", id);
			await updateDoc(taskRef, updates as any);
		} catch (error) {
			console.error("Error updating task:", error);
		}
	};

	const deleteTask = async (id: string) => {
		if (!user?.uid) return;

		try {
			// Find the task to get its calendar event ID
			const task = tasks.find((t) => t.id === id);

			// Delete calendar event if synced
			if (task?.calendarEventId) {
				await calendarSync.deleteCalendarEvent(task.calendarEventId);
			}

			const taskRef = doc(db, "tasks", id);
			await deleteDoc(taskRef);
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

			const classesRef = collection(db, "classes");
			await addDoc(classesRef, {
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

			const classRef = doc(db, "classes", id);
			await updateDoc(classRef, updates as any);
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

			const classRef = doc(db, "classes", id);
			await deleteDoc(classRef);
		} catch (error) {
			console.error("Error deleting class:", error);
		}
	};

	const addGoal = (goal: Goal) => {
		const updated = [...goals, goal];
		setGoals(updated);
		syncGoalsMutation.mutate(updated);
	};

	const updateGoal = (id: string, updates: Partial<Goal>) => {
		const updated = goals.map((g) => (g.id === id ? { ...g, ...updates } : g));
		setGoals(updated);
		syncGoalsMutation.mutate(updated);
	};

	const deleteGoal = (id: string) => {
		const updated = goals.filter((g) => g.id !== id);
		setGoals(updated);
		syncGoalsMutation.mutate(updated);
	};

	const addNote = (note: Note) => {
		const updated = [...notes, note];
		setNotes(updated);
		syncNotesMutation.mutate(updated);
	};

	const updateNote = (id: string, updates: Partial<Note>) => {
		const updated = notes.map((n) => (n.id === id ? { ...n, ...updates } : n));
		setNotes(updated);
		syncNotesMutation.mutate(updated);
	};

	const deleteNote = (id: string) => {
		const updated = notes.filter((n) => n.id !== id);
		setNotes(updated);
		syncNotesMutation.mutate(updated);
	};

	const createStudyGroup = async (
		group: Omit<
			StudyGroup,
			"id" | "code" | "members" | "messages" | "createdAt"
		>
	) => {
		if (!user?.uid || !user?.email) return null;

		try {
			const code = Math.random().toString(36).substring(2, 10).toUpperCase();
			const groupData = {
				name: group.name,
				className: group.className,
				school: group.school,
				description: group.description,
				code: code,
				creatorId: user.uid,
				members: [{ email: user.email, joinedAt: new Date().toISOString() }],
				createdAt: Timestamp.now(),
			};

			const studyGroupsRef = collection(db, "studyGroups");
			const docRef = await addDoc(studyGroupsRef, groupData);

			return {
				id: docRef.id,
				...group,
				code: code,
				members: groupData.members,
				messages: [],
				createdAt: new Date().toISOString(),
			} as StudyGroup;
		} catch (error) {
			console.error("Error creating study group:", error);
			return null;
		}
	};

	const joinStudyGroup = async (code: string, email: string) => {
		if (!user?.uid) return null;

		try {
			// Query Firestore directly to find the group by code
			const studyGroupsRef = collection(db, "studyGroups");
			const q = query(studyGroupsRef, where("code", "==", code));
			const querySnapshot = await getDocs(q);

			if (querySnapshot.empty) {
				console.log("No group found with code:", code);
				return null;
			}

			const groupDoc = querySnapshot.docs[0];
			const groupData = groupDoc.data();

			// Check if already a member
			if (groupData.members?.some((m: any) => m.email === email)) {
				// Return the group data
				return {
					id: groupDoc.id,
					name: groupData.name,
					className: groupData.className || "",
					school: groupData.school || "",
					description: groupData.description,
					code: groupData.code,
					members: groupData.members,
					messages: [],
					createdAt:
						groupData.createdAt?.toDate?.()?.toISOString() ||
						new Date().toISOString(),
				} as StudyGroup;
			}

			const groupRef = doc(db, "studyGroups", groupDoc.id);
			const newMember = { email, joinedAt: new Date().toISOString() };

			await updateDoc(groupRef, {
				members: [...groupData.members, newMember],
			});

			// Send email notification to existing members (non-blocking)
			apiService
				.notifyGroupJoin(groupDoc.id, [email])
				.then((result) => {
					if (result.success) {
						console.log("✓ Join notification sent successfully");
					} else {
						console.log(
							"Join notification failed (non-critical):",
							result.error
						);
					}
				})
				.catch((error) => {
					console.log("Join notification error (non-critical):", error);
				});

			return {
				id: groupDoc.id,
				name: groupData.name,
				className: groupData.className || "",
				school: groupData.school || "",
				description: groupData.description,
				code: groupData.code,
				members: [...groupData.members, newMember],
				messages: [],
				createdAt:
					groupData.createdAt?.toDate?.()?.toISOString() ||
					new Date().toISOString(),
			} as StudyGroup;
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
		console.log("=== sendGroupMessage called ===");
		console.log("Group ID:", groupId);
		console.log("Sender:", senderEmail);
		console.log("Message:", message);
		console.log("User UID:", user?.uid);

		if (!user?.uid) {
			console.log("ERROR: No user UID - returning");
			return;
		}

		try {
			console.log("Creating message in Firestore...");
			const messagesRef = collection(db, "studyGroups", groupId, "messages");
			const docRef = await addDoc(messagesRef, {
				senderEmail,
				message,
				attachments: attachments || [],
				createdAt: Timestamp.now(),
			});
			console.log("Message created with ID:", docRef.id);

			// Send email notification to group members (non-blocking)
			apiService
				.notifyGroupMessage(groupId, docRef.id)
				.then((result) => {
					if (result.success) {
						console.log("✓ Email notification sent successfully");
					} else {
						console.log(
							"Email notification failed (non-critical):",
							result.error
						);
					}
				})
				.catch((error) => {
					console.log("Email notification error (non-critical):", error);
				});
		} catch (error) {
			console.error("Error sending group message:", error);
		}
	};

	const deleteStudyGroup = async (id: string) => {
		if (!user?.uid) return;

		try {
			const groupRef = doc(db, "studyGroups", id);
			await deleteDoc(groupRef);
			// Note: Messages subcollection should be deleted via Cloud Functions or manually
			// For now, they will remain orphaned but won't be accessible
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
		isLoading:
			tasksLoading ||
			classesLoading ||
			goalsQuery.isLoading ||
			notesQuery.isLoading,
	};
});
