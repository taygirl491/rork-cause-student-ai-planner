/**
 * Socket.IO Service for Real-time Study Groups
 * Manages WebSocket connections and events
 */

import io, { Socket } from 'socket.io-client';
import { auth } from '@/firebaseConfig';

class SocketService {
    private socket: Socket | null = null;
    private API_URL: string;

    constructor() {
        this.API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';
    }

    /**
     * Connect to Socket.IO server — passes Firebase ID token for server-side auth
     */
    async connect(userId: string) {
        if (this.socket?.connected) {
            console.log('Socket already connected, ensuring user channel joined');
            this.joinUser(userId);
            return;
        }

        let token = '';
        try {
            if (auth.currentUser) {
                token = await auth.currentUser.getIdToken();
            }
        } catch (e) {
            console.warn('[Socket] Could not get Firebase token:', e);
        }

        this.socket = io(this.API_URL, {
            auth: { token },
            query: { userId },
            transports: ['websocket', 'polling'],
            reconnection: true,
            reconnectionDelay: 2000,
            reconnectionDelayMax: 10000,
            reconnectionAttempts: 10,
            timeout: 60000,
        });

        this.socket.on('connect', () => {
            console.log('✓ Socket connected:', this.socket?.id);
            // Join the user channel for personal notifications
            this.joinUser(userId);
        });

        this.socket.on('disconnect', (reason) => {
            console.log('✗ Socket disconnected:', reason);
        });

        this.socket.on('connect_error', (error) => {
            console.error('Socket connection error:', error.message);
        });

        this.socket.on('reconnect', (attemptNumber) => {
            console.log('✓ Socket reconnected after', attemptNumber, 'attempts');
        });
    }

    /**
     * Disconnect from Socket.IO server
     */
    disconnect() {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
            console.log('Socket disconnected');
        }
    }

    /**
     * Join a study group room
     */
    joinGroup(groupId: string) {
        if (this.socket) {
            this.socket.emit('join-group', groupId);
            console.log('Joined group room:', groupId);
        }
    }

    /**
     * Leave a study group room
     */
    leaveGroup(groupId: string) {
        if (this.socket) {
            this.socket.emit('leave-group', groupId);
            console.log('Left group room:', groupId);
        }
    }

    joinUser(userId: string) {
        if (this.socket) {
            this.socket.emit('join-user', userId);
        }
    }

    /**
     * Listen for an event
     */
    on(event: string, callback: (...args: any[]) => void) {
        if (this.socket) {
            this.socket.on(event, callback);
        }
    }

    /**
     * Remove event listener
     */
    off(event: string, callback?: (...args: any[]) => void) {
        if (this.socket) {
            if (callback) {
                this.socket.off(event, callback);
            } else {
                this.socket.off(event);
            }
        }
    }

    /**
     * Check if socket is connected
     */
    isConnected(): boolean {
        return this.socket?.connected || false;
    }
}

// Export singleton instance
export default new SocketService();
