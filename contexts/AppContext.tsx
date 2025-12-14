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
	limit,
	startAfter,
	DocumentSnapshot,
} from "firebase/firestore";
import { useAuth } from "./AuthContext";
import * as calendarSync from "@/utils/calendarSync";
import * as NotificationService from "@/utils/notificationService";
import apiService from "@/utils/apiService";

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
	const [tasksLoading, setTasksLoading] = useState(true);
	const [classesLoading, setClassesLoading] = useState(true);
	const [goalsLoading, setGoalsLoading] = useState(true);
	const [notesLoading, setNotesLoading] = useState(true);
	const [calendarSyncEnabled, setCalendarSyncEnabled] = useState(false);
	const [appCalendarId, setAppCalendarId] = useState<string | null>(null);

	// Pagination state for tasks
	const TASKS_PAGE_SIZE = 20;
	const [lastTaskDoc, setLastTaskDoc] = useState<DocumentSnapshot | null>(null);
	const [hasMoreTasks, setHasMoreTasks] = useState(true);
	const [loadingMoreTasks, setLoadingMoreTasks] = useState(false);

	// Video Configuration State
	const [videoConfig, setVideoConfig] = useState({
		homeVideoId: "VRSnKzgVTiU", // Default Home Video
		causesVideoId: "dQw4w9WgXcQ" // Default Causes Video
	});

	// Pagination state for classes
	const CLASSES_PAGE_SIZE = 20;
	const [lastClassDoc, setLastClassDoc] = useState<DocumentSnapshot | null>(null);
	const [hasMoreClasses, setHasMoreClasses] = useState(true);
	const [loadingMoreClasses, setLoadingMoreClasses] = useState(false);

	// Real-time Firestore listener for tasks
	useEffect(() => {
		if (!user?.uid) {
			setTasks([]);
			setTasksLoading(false);
			setLastTaskDoc(null);
			setHasMoreTasks(true);
			return;
		}

		const tasksRef = collection(db, "tasks");
		const q = query(
			tasksRef,
			where("userId", "==", user.uid),
			orderBy("createdAt", "desc"),
			limit(TASKS_PAGE_SIZE)
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

				// Set last document for pagination
				if (snapshot.docs.length > 0) {
					setLastTaskDoc(snapshot.docs[snapshot.docs.length - 1]);
					setHasMoreTasks(snapshot.docs.length === TASKS_PAGE_SIZE);
				} else {
					setHasMoreTasks(false);
				}
			},
			(error) => {
				console.error("Firestore listener error:", error);
				setTasksLoading(false);
			}
		);

		return () => unsubscribe();
	}, [user?.uid]);

	// Load more tasks function
	const loadMoreTasks = async () => {
		if (!user?.uid || !lastTaskDoc || !hasMoreTasks || loadingMoreTasks) {
			return;
		}
		setLoadingMoreTasks(true);
		try {
			const tasksRef = collection(db, "tasks");
			const q = query(
				tasksRef,
				where("userId", "==", user.uid),
				orderBy("createdAt", "desc"),
				startAfter(lastTaskDoc),
				limit(TASKS_PAGE_SIZE)
			);
			const snapshot = await getDocs(q);
			const newTasks: Task[] = [];
			snapshot.forEach((doc) => {
				const data = doc.data();
				newTasks.push({
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
			setTasks((prev) => [...prev, ...newTasks]);
			if (snapshot.docs.length > 0) {
				setLastTaskDoc(snapshot.docs[snapshot.docs.length - 1]);
				setHasMoreTasks(snapshot.docs.length === TASKS_PAGE_SIZE);
			} else {
				setHasMoreTasks(false);
			}
		} catch (error) {
			console.error("Error loading more tasks:", error);
		} finally {
			setLoadingMoreTasks(false);
		}
	};

	// Real-time Firestore listener for classes
	useEffect(() => {
		if (!user?.uid) {
			setClasses([]);
			setClassesLoading(false);
			setLastClassDoc(null);
			setHasMoreClasses(true);
			return;
		}

		const classesRef = collection(db, "classes");
		const q = query(
			classesRef,
			where("userId", "==", user.uid),
			orderBy("createdAt", "desc"),
			limit(CLASSES_PAGE_SIZE)
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

				if (snapshot.docs.length > 0) {
					setLastClassDoc(snapshot.docs[snapshot.docs.length - 1]);
					setHasMoreClasses(snapshot.docs.length === CLASSES_PAGE_SIZE);
				} else {
					setHasMoreClasses(false);
				}
			},
			(error) => {
				console.error("Firestore classes listener error:", error);
				setClassesLoading(false);
			}
		);

		return () => unsubscribe();
	}, [user?.uid]);

	// Load more classes function
	const loadMoreClasses = async () => {
		if (
			!user?.uid ||
			!lastClassDoc ||
			!hasMoreClasses ||
			loadingMoreClasses
		) {
			return;
		}
		setLoadingMoreClasses(true);
		try {
			const classesRef = collection(db, "classes");
			const q = query(
				classesRef,
				where("userId", "==", user.uid),
				orderBy("createdAt", "desc"),
				startAfter(lastClassDoc),
				limit(CLASSES_PAGE_SIZE)
			);

			const snapshot = await getDocs(q);
			const newClasses: Class[] = [];
			snapshot.forEach((doc) => {
				const data = doc.data();
				newClasses.push({
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

			setClasses((prev) => [...prev, ...newClasses]);

			if (snapshot.docs.length > 0) {
				setLastClassDoc(snapshot.docs[snapshot.docs.length - 1]);
				setHasMoreClasses(snapshot.docs.length === CLASSES_PAGE_SIZE);
			} else {
				setHasMoreClasses(false);
			}
		} catch (error) {
			console.error("Error loading more classes:", error);
		} finally {
			setLoadingMoreClasses(false);
		}
	};

	// Real-time Firestore listener for study groups
	useEffect(() => {
		if (!user?.uid || !user?.email) {
			setStudyGroups([]);
			return;
		}

		const studyGroupsRef = collection(db, "studyGroups");
		const q = query(studyGroupsRef, orderBy("createdAt", "desc"));

		let messageUnsubscribers: (() => void)[] = [];

		const unsubscribe = onSnapshot(
			q,
			(snapshot) => {
				// Clean up previous message listeners
				messageUnsubscribers.forEach((unsub) => unsub());
				messageUnsubscribers = [];

				const groupsData: StudyGroup[] = [];

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
			},
			(error) => {
				console.error("Firestore study groups listener error:", error);
			}
		);

		return () => {
			unsubscribe();
			messageUnsubscribers.forEach((unsub) => unsub());
		};
	}, [user?.uid, user?.email]);

	// Real-time Firestore listener for goals
	useEffect(() => {
		if (!user?.uid) {
			setGoals([]);
			setGoalsLoading(false);
			return;
		}

		const goalsRef = collection(db, "goals");
		const q = query(
			goalsRef,
			where("userId", "==", user.uid),
			orderBy("createdAt", "desc")
		);

		const unsubscribe = onSnapshot(
			q,
			(snapshot) => {
				const goalsData: Goal[] = [];
				snapshot.forEach((doc) => {
					const data = doc.data();
					goalsData.push({
						id: doc.id,
						title: data.title,
						description: data.description,
						dueDate: data.dueDate,
						completed: data.completed,
						habits: data.habits || [],
						createdAt: data.createdAt,
					});
				});
				setGoals(goalsData);
				setGoalsLoading(false);
			},
			(error) => {
				console.error("Firestore goals listener error:", error);
				setGoalsLoading(false);
			}
		);

		return () => unsubscribe();
	}, [user?.uid]);

	// Notes Firestore listener
	useEffect(() => {
		if (!user?.uid) {
			setNotes([]);
			return;
		}

		const notesRef = collection(db, "notes");
		const q = query(
			notesRef,
			where("userId", "==", user.uid),
			orderBy("updatedAt", "desc")
		);

		const unsubscribe = onSnapshot(
			q,
			(snapshot) => {
				const notesData: Note[] = [];
				snapshot.forEach((doc) => {
					const data = doc.data();
					notesData.push({
						id: doc.id,
						title: data.title,
						className: data.className || "",
						content: data.content,
						createdAt:
							data.createdAt?.toDate?.()?.toISOString() ||
							new Date().toISOString(),
						updatedAt:
							data.updatedAt?.toDate?.()?.toISOString() ||
							new Date().toISOString(),
					});
				});
				setNotes(notesData);
				setNotesLoading(false);
			},
			(error) => {
				console.error("Firestore notes listener error:", error);
			}
		);

		return () => unsubscribe();
	}, [user?.uid]);

	// Video Configuration Listener
	useEffect(() => {
		const videoDocRef = doc(db, 'content', 'videos');
		const unsubscribe = onSnapshot(videoDocRef, (docSnap) => {
			if (docSnap.exists()) {
				const data = docSnap.data();
				setVideoConfig({
					homeVideoId: data.homeVideoId || "VRSnKzgVTiU",
					causesVideoId: data.causesVideoId || "dQw4w9WgXcQ"
				});
			}
		}, (error) => {
			console.error("Error listening to video config:", error);
		});

		return () => unsubscribe();
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

			const tasksRef = collection(db, "tasks");
			const docRef = await addDoc(tasksRef, {
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

			// Schedule notification if reminder is set and task is not completed
			if (task.reminder && !task.completed) {
				await NotificationService.scheduleTaskReminder({
					...task,
					id: docRef.id,
				});
			}

			// Schedule due date notification if task is not completed
			if (!task.completed) {
				await NotificationService.scheduleDueDateNotification({
					...task,
					id: docRef.id,
				});
			}
		} catch (error) {
			console.error("Error adding task:", error);
		}
	};

	const updateTask = async (id: string, updates: Partial<Task>) => {
		if (!user?.uid) return;

		try {
			// Find the task to get its calendar event ID
			const task = tasks.find((t) => t.id === id);
			if (!task) return;

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

			const taskRef = doc(db, "tasks", id);
			await updateDoc(taskRef, updates as any);

			// Reschedule notification if task is not completed and has reminder
			const updatedTask = { ...task, ...updates };
			if (updatedTask.reminder && !updatedTask.completed) {
				await NotificationService.scheduleTaskReminder(updatedTask);
			}

			// Reschedule due date notification if task is not completed
			if (!updatedTask.completed) {
				await NotificationService.scheduleDueDateNotification(updatedTask);
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

	const addGoal = async (goal: Goal) => {
		if (!user?.uid) return;

		try {
			const goalsRef = collection(db, "goals");
			await addDoc(goalsRef, {
				userId: user.uid,
				title: goal.title,
				description: goal.description || "",
				dueDate: goal.dueDate || "",
				completed: goal.completed,
				habits: goal.habits,
				createdAt: goal.createdAt,
			});
		} catch (error) {
			console.error("Error adding goal:", error);
		}
	};

	const updateGoal = async (id: string, updates: Partial<Goal>) => {
		if (!user?.uid) return;

		try {
			const goalRef = doc(db, "goals", id);
			await updateDoc(goalRef, updates as any);
		} catch (error) {
			console.error("Error updating goal:", error);
		}
	};

	const deleteGoal = async (id: string) => {
		if (!user?.uid) return;

		try {
			const goalRef = doc(db, "goals", id);
			await deleteDoc(goalRef);
		} catch (error) {
			console.error("Error deleting goal:", error);
		}
	};

	const addNote = async (note: Omit<Note, "id">) => {
		if (!user?.uid) return;

		try {
			const notesRef = collection(db, "notes");
			await addDoc(notesRef, {
				userId: user.uid,
				title: note.title,
				className: note.className || "",
				content: note.content,
				createdAt: Timestamp.now(),
				updatedAt: Timestamp.now(),
			});
		} catch (error) {
			console.error("Error adding note:", error);
		}
	};

	const updateNote = async (id: string, updates: Partial<Note>) => {
		if (!user?.uid) return;

		try {
			const noteRef = doc(db, "notes", id);
			await updateDoc(noteRef, {
				...updates,
				updatedAt: Timestamp.now(),
			} as any);
		} catch (error) {
			console.error("Error updating note:", error);
		}
	};

	const deleteNote = async (id: string) => {
		if (!user?.uid) return;

		try {
			const noteRef = doc(db, "notes", id);
			await deleteDoc(noteRef);
		} catch (error) {
			console.error("Error deleting note:", error);
		}
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
			// Upload attachments if any
			let finalAttachments = attachments || [];

			if (finalAttachments.length > 0) {
				console.log("Uploading attachments...");
				const uploadResult = await apiService.uploadFiles(finalAttachments);

				if (uploadResult.success && uploadResult.files) {
					console.log("Attachments uploaded successfully");
					// Map uploaded files to the format expected by Firestore
					finalAttachments = uploadResult.files.map((file: any) => ({
						name: file.name,
						uri: file.url, // Use remote URL as the URI for consistency
						url: file.url, // Explicitly add url for backend compatibility
						type: file.type,
					}));
				} else {
					console.error("Failed to upload attachments:", uploadResult.error);
					// You might want to throw or alert here, but for now we proceed
					// (images won't load for others but message sends)
				}
			}

			console.log("Creating message in Firestore...");
			const messagesRef = collection(db, "studyGroups", groupId, "messages");
			const docRef = await addDoc(messagesRef, {
				senderEmail,
				message,
				attachments: finalAttachments,
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
		loadMoreTasks,
		hasMoreTasks,
		loadingMoreTasks,
		loadMoreClasses,
		hasMoreClasses,
		loadingMoreClasses,
		isLoading: tasksLoading || classesLoading || goalsLoading || notesLoading,
		videoConfig,
	};
});
