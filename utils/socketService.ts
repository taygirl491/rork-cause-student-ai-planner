/**
 * Socket.IO Service for Real-time Study Groups
 * Manages WebSocket connections and events
 */

import io, { Socket } from 'socket.io-client';

class SocketService {
    private socket: Socket | null = null;
    private API_URL: string;

    constructor() {
        this.API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';
    }

    /**
     * Connect to Socket.IO server
     */
    connect(userId: string) {
        if (this.socket?.connected) {
            console.log('Socket already connected');
            return;
        }

        this.socket = io(this.API_URL, {
            query: { userId },
            transports: ['websocket', 'polling'],
            reconnection: true,
            reconnectionDelay: 2000,
            reconnectionDelayMax: 10000,
            reconnectionAttempts: 10,
            timeout: 60000, // Increased from default 20s to handle cold starts
        });

        this.socket.on('connect', () => {
            console.log('✓ Socket connected:', this.socket?.id);
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
        if (this.socket?.connected) {
            this.socket.emit('join-group', groupId);
            console.log('Joined group room:', groupId);
        }
    }

    /**
     * Leave a study group room
     */
    leaveGroup(groupId: string) {
        if (this.socket?.connected) {
            this.socket.emit('leave-group', groupId);
            console.log('Left group room:', groupId);
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
