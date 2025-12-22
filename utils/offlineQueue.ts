import AsyncStorage from '@react-native-async-storage/async-storage';

interface QueuedOperation {
	id: string;
	type: 'create' | 'update' | 'delete';
	entity: 'task' | 'class' | 'note' | 'goal';
	data: any;
	timestamp: number;
	retryCount: number;
}

class OfflineQueueService {
	private queue: QueuedOperation[] = [];
	private isOnline: boolean = true;
	private listeners: ((isOnline: boolean) => void)[] = [];
	private processingQueue: boolean = false;
	private networkCheckInterval: NodeJS.Timeout | null = null;
	private readonly QUEUE_KEY = '@offline_queue';
	private readonly MAX_RETRIES = 5;
	private readonly MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours
	private readonly NETWORK_CHECK_INTERVAL = 10000; // Check every 10 seconds

	constructor() {
		this.init();
	}

	private async init() {
		// Load queue from storage
		await this.loadQueue();

		// Check initial network state
		await this.checkNetworkStatus();

		// Periodically check network status
		this.networkCheckInterval = setInterval(() => {
			this.checkNetworkStatus();
		}, this.NETWORK_CHECK_INTERVAL);
	}

	private async checkNetworkStatus() {
		try {
			// Simple network check - try to fetch a small resource
			const controller = new AbortController();
			const timeoutId = setTimeout(() => controller.abort(), 5000);
			
			await fetch('https://www.google.com/favicon.ico', {
				method: 'HEAD',
				signal: controller.signal,
			});
			
			clearTimeout(timeoutId);
			this.updateNetworkStatus(true);
		} catch (error) {
			this.updateNetworkStatus(false);
		}
	}

	private updateNetworkStatus(isOnline: boolean) {
		const wasOnline = this.isOnline;
		this.isOnline = isOnline;

		// Notify listeners if status changed
		if (wasOnline !== isOnline) {
			this.listeners.forEach(listener => listener(this.isOnline));

			// Process queue when coming back online
			if (!wasOnline && this.isOnline) {
				this.processQueue();
			}
		}
	}

	// Cleanup method
	destroy() {
		if (this.networkCheckInterval) {
			clearInterval(this.networkCheckInterval);
			this.networkCheckInterval = null;
		}
	}

	// Add listener for network status changes
	addNetworkListener(listener: (isOnline: boolean) => void) {
		this.listeners.push(listener);
		// Immediately call with current status
		listener(this.isOnline);
	}

	removeNetworkListener(listener: (isOnline: boolean) => void) {
		this.listeners = this.listeners.filter(l => l !== listener);
	}

	getNetworkStatus(): boolean {
		return this.isOnline;
	}

	// Add operation to queue
	async addToQueue(operation: Omit<QueuedOperation, 'id' | 'timestamp' | 'retryCount'>) {
		const queuedOp: QueuedOperation = {
			...operation,
			id: `${operation.entity}_${operation.type}_${Date.now()}_${Math.random()}`,
			timestamp: Date.now(),
			retryCount: 0,
		};

		this.queue.push(queuedOp);
		await this.saveQueue();

		console.log(`[OfflineQueue] Added operation to queue:`, queuedOp);
	}

	// Process all queued operations
	async processQueue() {
		if (this.processingQueue || !this.isOnline || this.queue.length === 0) {
			return;
		}

		this.processingQueue = true;
		console.log(`[OfflineQueue] Processing ${this.queue.length} queued operations`);

		// Clean up old operations (>24 hours)
		this.queue = this.queue.filter(op => {
			const age = Date.now() - op.timestamp;
			return age < this.MAX_AGE_MS;
		});

		// Process operations one by one
		const operationsToProcess = [...this.queue];
		for (const operation of operationsToProcess) {
			try {
				// Operation will be retried by the caller
				// We just remove it from queue if it succeeds
				await this.retryOperation(operation);
				
				// Remove from queue on success
				this.queue = this.queue.filter(op => op.id !== operation.id);
			} catch (error) {
				console.error(`[OfflineQueue] Failed to process operation:`, operation, error);
				
				// Increment retry count
				const opIndex = this.queue.findIndex(op => op.id === operation.id);
				if (opIndex !== -1) {
					this.queue[opIndex].retryCount++;
					
					// Remove if max retries reached
					if (this.queue[opIndex].retryCount >= this.MAX_RETRIES) {
						console.warn(`[OfflineQueue] Max retries reached, removing operation:`, operation);
						this.queue.splice(opIndex, 1);
					}
				}
			}
		}

		await this.saveQueue();
		this.processingQueue = false;

		console.log(`[OfflineQueue] Queue processing complete. ${this.queue.length} operations remaining`);
	}

	private async retryOperation(operation: QueuedOperation): Promise<void> {
		// This will be called by AppContext with the actual retry logic
		// For now, we just throw to indicate it needs to be retried
		throw new Error('Operation needs retry');
	}

	// Get pending operations count
	getPendingCount(): number {
		return this.queue.length;
	}

	// Get all pending operations
	getPendingOperations(): QueuedOperation[] {
		return [...this.queue];
	}

	// Remove specific operation from queue
	async removeFromQueue(id: string) {
		this.queue = this.queue.filter(op => op.id !== id);
		await this.saveQueue();
	}

	// Clear all operations
	async clearQueue() {
		this.queue = [];
		await this.saveQueue();
	}

	// Persist queue to AsyncStorage
	private async saveQueue() {
		try {
			await AsyncStorage.setItem(this.QUEUE_KEY, JSON.stringify(this.queue));
		} catch (error) {
			console.error('[OfflineQueue] Failed to save queue:', error);
		}
	}

	// Load queue from AsyncStorage
	private async loadQueue() {
		try {
			const stored = await AsyncStorage.getItem(this.QUEUE_KEY);
			if (stored) {
				this.queue = JSON.parse(stored);
				console.log(`[OfflineQueue] Loaded ${this.queue.length} operations from storage`);
			}
		} catch (error) {
			console.error('[OfflineQueue] Failed to load queue:', error);
			this.queue = [];
		}
	}
}

// Export singleton instance
export const offlineQueue = new OfflineQueueService();
export type { QueuedOperation };
