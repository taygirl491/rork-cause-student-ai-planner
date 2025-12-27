/**
 * API Service for data operations
 * Replaces direct Firestore calls with backend API calls
 */

import apiService from './apiService';
import { Task, Class, Note, Goal } from '@/types';

export const tasksAPI = {
    /**
     * Get all tasks for a user
     */
    async getTasks(userId: string): Promise<Task[]> {
        try {
            const response = await apiService.get(`/api/tasks/${userId}`);
            if (response.success) {
                return response.tasks.map((task: any) => ({
                    id: task._id,
                    description: task.description,
                    type: task.type,
                    className: task.className,
                    dueDate: task.dueDate,
                    dueTime: task.dueTime,
                    priority: task.priority,
                    reminder: task.reminder,
                    customReminderDate: task.customReminderDate,
                    alarmEnabled: task.alarmEnabled,
                    completed: task.completed,
                    createdAt: task.createdAt,
                    calendarEventId: task.calendarEventId,
                }));
            }
            return [];
        } catch (error) {
            console.error('Error fetching tasks:', error);
            return [];
        }
    },

    /**
     * Create a new task
     */
    async createTask(taskData: Partial<Task>): Promise<Task | null> {
        try {
            const response = await apiService.post('/api/tasks', taskData);
            if (response.success) {
                const task = response.task;
                return {
                    id: task._id,
                    description: task.description,
                    type: task.type,
                    className: task.className,
                    dueDate: task.dueDate,
                    dueTime: task.dueTime,
                    priority: task.priority,
                    reminder: task.reminder,
                    customReminderDate: task.customReminderDate,
                    alarmEnabled: task.alarmEnabled,
                    completed: task.completed,
                    createdAt: task.createdAt,
                    calendarEventId: task.calendarEventId,
                };
            }
            return null;
        } catch (error) {
            console.error('Error creating task:', error);
            return null;
        }
    },

    /**
     * Update a task
     */
    async updateTask(taskId: string, updates: Partial<Task>): Promise<boolean> {
        try {
            const response = await apiService.put(`/api/tasks/${taskId}`, updates);
            return response.success;
        } catch (error) {
            console.error('Error updating task:', error);
            return false;
        }
    },

    /**
     * Delete a task
     */
    async deleteTask(taskId: string): Promise<boolean> {
        try {
            const response = await apiService.delete(`/api/tasks/${taskId}`);
            return response.success;
        } catch (error) {
            console.error('Error deleting task:', error);
            return false;
        }
    },
};

export const classesAPI = {
    async getClasses(userId: string): Promise<Class[]> {
        try {
            const response = await apiService.get(`/api/classes/${userId}`);
            if (response.success) {
                return response.classes.map((cls: any) => ({
                    id: cls._id,
                    name: cls.name,
                    section: cls.section || '',
                    daysOfWeek: Array.isArray(cls.daysOfWeek) ? cls.daysOfWeek : [],
                    time: cls.time || '',
                    professor: cls.professor || '',
                    startDate: cls.startDate || '',
                    endDate: cls.endDate || '',
                    color: cls.color || '#6366F1',
                    createdAt: cls.createdAt,
                    calendarEventId: cls.calendarEventId || null,
                }));
            }
            return [];
        } catch (error) {
            console.error('Error fetching classes:', error);
            return [];
        }
    },

    async createClass(classData: Partial<Class>): Promise<Class | null> {
        try {
            const response = await apiService.post('/api/classes', classData);
            if (response.success) {
                const cls = response.class;
                return {
                    id: cls._id,
                    name: cls.name,
                    section: cls.section,
                    daysOfWeek: cls.daysOfWeek,
                    time: cls.time,
                    professor: cls.professor,
                    startDate: cls.startDate,
                    endDate: cls.endDate,
                    color: cls.color,
                    createdAt: cls.createdAt,
                    calendarEventId: cls.calendarEventId,
                };
            }
            return null;
        } catch (error) {
            console.error('Error creating class:', error);
            return null;
        }
    },

    async updateClass(classId: string, updates: Partial<Class>): Promise<boolean> {
        try {
            const response = await apiService.put(`/api/classes/${classId}`, updates);
            return response.success;
        } catch (error) {
            console.error('Error updating class:', error);
            return false;
        }
    },

    async deleteClass(classId: string): Promise<boolean> {
        try {
            const response = await apiService.delete(`/api/classes/${classId}`);
            return response.success;
        } catch (error) {
            console.error('Error deleting class:', error);
            return false;
        }
    },
};

export const notesAPI = {
    async getNotes(userId: string): Promise<Note[]> {
        try {
            const response = await apiService.get(`/api/notes/${userId}`);
            if (response.success) {
                return response.notes.map((note: any) => ({
                    id: note._id,
                    title: note.title,
                    className: note.className,
                    content: note.content,
                    createdAt: note.createdAt,
                    updatedAt: note.updatedAt || note.createdAt,
                }));
            }
            return [];
        } catch (error) {
            console.error('Error fetching notes:', error);
            return [];
        }
    },

    async createNote(noteData: Partial<Note>): Promise<Note | null> {
        try {
            const response = await apiService.post('/api/notes', noteData);
            if (response.success) {
                const note = response.note;
                return {
                    id: note._id,
                    title: note.title,
                    className: note.className,
                    content: note.content,
                    createdAt: note.createdAt,
                    updatedAt: note.updatedAt || note.createdAt,
                };
            }
            return null;
        } catch (error) {
            console.error('Error creating note:', error);
            return null;
        }
    },

    async updateNote(noteId: string, updates: Partial<Note>): Promise<boolean> {
        try {
            const response = await apiService.put(`/api/notes/${noteId}`, updates);
            return response.success;
        } catch (error) {
            console.error('Error updating note:', error);
            return false;
        }
    },

    async deleteNote(noteId: string): Promise<boolean> {
        try {
            const response = await apiService.delete(`/api/notes/${noteId}`);
            return response.success;
        } catch (error) {
            console.error('Error deleting note:', error);
            return false;
        }
    },
};

export const goalsAPI = {
    async getGoals(userId: string): Promise<Goal[]> {
        try {
            const response = await apiService.get(`/api/goals/${userId}`);
            if (response.success) {
                return response.goals.map((goal: any) => ({
                    id: goal._id,
                    title: goal.title,
                    description: goal.description,
                    dueDate: goal.dueDate,
                    dueTime: goal.dueTime,
                    completed: goal.completed,
                    notificationId: goal.notificationId,
                    createdAt: goal.createdAt,
                }));
            }
            return [];
        } catch (error) {
            console.error('Error fetching goals:', error);
            return [];
        }
    },

    async createGoal(goalData: Partial<Goal>): Promise<Goal | null> {
        try {
            const response = await apiService.post('/api/goals', goalData);
            if (response.success) {
                const goal = response.goal;
                return {
                    id: goal._id,
                    title: goal.title,
                    description: goal.description,
                    dueDate: goal.dueDate,
                    dueTime: goal.dueTime,
                    completed: goal.completed,
                    notificationId: goal.notificationId,
                    createdAt: goal.createdAt,
                };
            }
            return null;
        } catch (error) {
            console.error('Error creating goal:', error);
            return null;
        }
    },

    async updateGoal(goalId: string, updates: Partial<Goal>): Promise<boolean> {
        try {
            const response = await apiService.put(`/api/goals/${goalId}`, updates);
            return response.success;
        } catch (error) {
            console.error('Error updating goal:', error);
            return false;
        }
    },

    async deleteGoal(goalId: string): Promise<boolean> {
        try {
            const response = await apiService.delete(`/api/goals/${goalId}`);
            return response.success;
        } catch (error) {
            console.error('Error deleting goal:', error);
            return false;
        }
    },
};

export const studyGroupsAPI = {
    /**
     * Get all study groups for a user
     */
    async getStudyGroups(userId: string, userEmail: string): Promise<any[]> {
        try {
            const response = await apiService.get(`/api/study-groups/${userId}?email=${encodeURIComponent(userEmail)}`);
            if (response.success) {
                return response.groups.map((group: any) => ({
                    id: group._id,
                    name: group.name,
                    className: group.className,
                    school: group.school,
                    description: group.description,
                    code: group.code, // May be undefined for private groups
                    creatorId: group.creatorId,
                    isPrivate: group.isPrivate,
                    members: group.members,
                    messages: group.messages || [],
                    createdAt: group.createdAt,
                }));
            }
            return [];
        } catch (error) {
            console.error('Error fetching study groups:', error);
            return [];
        }
    },

    /**
     * Create a new study group
     */
    async createStudyGroup(data: {
        name: string;
        className: string;
        school: string;
        description: string;
        creatorId: string;
        creatorEmail: string;
        creatorName: string;
        isPrivate?: boolean;
    }): Promise<any | null> {
        try {
            const response = await apiService.post('/api/study-groups', data);
            if (response.success) {
                const group = response.group;
                return {
                    id: group._id,
                    name: group.name,
                    className: group.className,
                    school: group.school,
                    description: group.description,
                    code: group.code,
                    creatorId: group.creatorId,
                    isPrivate: group.isPrivate,
                    members: group.members,
                    createdAt: group.createdAt,
                };
            }
            return null;
        } catch (error) {
            console.error('Error creating study group:', error);
            return null;
        }
    },

    /**
     * Join a study group by code (creates pending request)
     */
    async joinStudyGroup(code: string, email: string, name: string, userId: string): Promise<any | null> {
        try {
            const response = await apiService.post('/api/study-groups/join', {
                code,
                email,
                name,
                userId,
            });
            if (response.success) {
                // Check if it's a pending status
                if (response.status === 'pending') {
                    return {
                        status: 'pending',
                        message: response.message,
                    };
                }
                // Otherwise return the group (already a member)
                const group = response.group;
                return {
                    status: 'joined',
                    id: group._id,
                    name: group.name,
                    className: group.className,
                    school: group.school,
                    description: group.description,
                    code: group.code,
                    creatorId: group.creatorId,
                    members: group.members,
                    createdAt: group.createdAt,
                };
            }
            return null;
        } catch (error) {
            console.error('Error joining study group:', error);
            return null;
        }
    },

    /**
     * Approve a pending member (admin only)
     */
    async approveMember(groupId: string, email: string, adminUserId: string): Promise<boolean> {
        try {
            const response = await apiService.post(`/api/study-groups/${groupId}/approve-member`, {
                email,
                adminUserId,
            });
            return response.success;
        } catch (error) {
            console.error('Error approving member:', error);
            return false;
        }
    },

    /**
     * Reject a pending member (admin only)
     */
    async rejectMember(groupId: string, email: string, adminUserId: string): Promise<boolean> {
        try {
            const response = await apiService.post(`/api/study-groups/${groupId}/reject-member`, {
                email,
                adminUserId,
            });
            return response.success;
        } catch (error) {
            console.error('Error rejecting member:', error);
            return false;
        }
    },

    /**
     * Kick a member from the group (admin only)
     */
    async kickMember(groupId: string, email: string, adminUserId: string): Promise<boolean> {
        try {
            const response = await apiService.post(`/api/study-groups/${groupId}/kick-member`, {
                email,
                adminUserId,
            });
            return response.success;
        } catch (error) {
            console.error('Error kicking member:', error);
            return false;
        }
    },

    /**
     * Promote a member to admin (creator only)
     */
    async promoteToAdmin(groupId: string, userId: string, creatorId: string): Promise<boolean> {
        try {
            const response = await apiService.post(`/api/study-groups/${groupId}/promote-admin`, {
                userId,
                creatorId,
            });
            return response.success;
        } catch (error) {
            console.error('Error promoting to admin:', error);
            return false;
        }
    },

    /**
     * Demote an admin to member (creator only)
     */
    async demoteAdmin(groupId: string, userId: string, creatorId: string): Promise<boolean> {
        try {
            const response = await apiService.post(`/api/study-groups/${groupId}/demote-admin`, {
                userId,
                creatorId,
            });
            return response.success;
        } catch (error) {
            console.error('Error demoting admin:', error);
            return false;
        }
    },

    /**
     * Get pending members for a group (admin only)
     */
    async getPendingMembers(groupId: string, adminUserId: string): Promise<any[]> {
        try {
            const response = await apiService.get(`/api/study-groups/${groupId}/pending-members?adminUserId=${adminUserId}`);
            if (response.success) {
                return response.pendingMembers || [];
            }
            return [];
        } catch (error) {
            console.error('Error getting pending members:', error);
            return [];
        }
    },

    /**
     * Delete a study group
     */
    async deleteStudyGroup(groupId: string): Promise<boolean> {
        try {
            const response = await apiService.delete(`/api/study-groups/${groupId}`);
            return response.success;
        } catch (error) {
            console.error('Error deleting study group:', error);
            return false;
        }
    },

    /**
     * Get messages for a study group
     */
    async getMessages(groupId: string): Promise<any[]> {
        try {
            const response = await apiService.get(`/api/study-groups/${groupId}/messages`);
            if (response.success) {
                return response.messages.map((msg: any) => ({
                    id: msg._id,
                    senderEmail: msg.senderEmail,
                    senderName: msg.senderName,
                    message: msg.message,
                    attachments: msg.attachments || [],
                    createdAt: msg.createdAt,
                }));
            }
            return [];
        } catch (error) {
            console.error('Error fetching messages:', error);
            return [];
        }
    },

    /**
     * Send a message to a study group
     */
    async sendMessage(groupId: string, data: {
        senderEmail: string;
        senderName: string;
        message: string;
        attachments?: any[];
    }): Promise<any | null> {
        try {
            const response = await apiService.post(`/api/study-groups/${groupId}/messages`, data);
            if (response.success) {
                const msg = response.message;
                return {
                    id: msg._id,
                    senderEmail: msg.senderEmail,
                    senderName: msg.senderName,
                    message: msg.message,
                    attachments: msg.attachments || [],
                    createdAt: msg.createdAt,
                };
            }
            return null;
        } catch (error) {
            console.error('Error sending message:', error);
            return null;
        }
    },
};
