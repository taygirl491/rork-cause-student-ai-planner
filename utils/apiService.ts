import { readAsStringAsync } from "expo-file-system/legacy";

import { Platform } from 'react-native';

const DEV_API_URL = Platform.OS === 'android' ? 'http://10.0.2.2:3000' : 'http://localhost:3000';
const API_BASE_URL = "https://rork-cause-student-ai-planner.onrender.com";  // Use production server
const API_KEY = process.env.EXPO_PUBLIC_API_KEY || "";

// Timeout helper with better error handling
const fetchWithTimeout = async (
	url: string,
	options: RequestInit,
	timeout = 30000
) => {
	const controller = new AbortController();
	const timeoutId = setTimeout(() => {
		console.log(`[API] Request timeout after ${timeout}ms`);
		controller.abort();
	}, timeout);

	try {
		const response = await fetch(url, {
			...options,
			signal: controller.signal,
		});
		clearTimeout(timeoutId);
		return response;
	} catch (error: any) {
		clearTimeout(timeoutId);
		if (error.name === "AbortError") {
			throw new Error(`Request timeout after ${timeout}ms`);
		}
		throw error;
	}
};

/**
 * API service for backend communication
 */
class ApiService {
	/**
	 * Send notification when a user joins a study group
	 */
	async notifyGroupJoin(groupId: string, newMemberEmails: string[]) {
		try {
			console.log(`[API] Calling ${API_BASE_URL}/api/notify/group-join`);
			const response = await fetchWithTimeout(
				`${API_BASE_URL}/api/notify/group-join`,
				{
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						"x-api-key": API_KEY,
					},
					body: JSON.stringify({
						groupId,
						newMemberEmails,
					}),
				},
				30000
			);

			console.log("[API] Join response status:", response.status);

			if (!response.ok) {
				const error = await response.json();
				console.log("[API] Join response error:", error);
				return { success: false, error: error.message || "Request failed" };
			}

			const result = await response.json();
			console.log("[API] Join notification result:", result);
			return { success: true, ...result };
		} catch (error: any) {
			console.error("[API] Join notification error:", error.message || error);
			return { success: false, error: error.message || String(error) };
		}
	}
	/**
	 * Send welcome email to new user
	 */
	async sendWelcomeEmail(email: string, name: string) {
		try {
			console.log(`[API] Sending welcome email to ${email}`);
			const response = await fetchWithTimeout(
				`${API_BASE_URL}/api/auth/welcome-email`,
				{
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						"x-api-key": API_KEY,
					},
					body: JSON.stringify({
						email,
						name,
					}),
				},
				10000 // 10 second timeout
			);

			if (!response.ok) {
				const error = await response.json();
				console.log("[API] Welcome email error:", error);
				return { success: false, error: error.message || "Request failed" };
			}

			const result = await response.json();
			console.log("[API] Welcome email sent successfully");
			return { success: true, ...result };
		} catch (error: any) {
			console.error("[API] Welcome email error:", error.message || error);
			// Don't throw - welcome email failure shouldn't block registration
			return { success: false, error: error.message || String(error) };
		}
	}

	/**
	 * Test backend connection
	 */
	async healthCheck() {
		try {
			const response = await fetch(`${API_BASE_URL}/health`);
			return await response.json();
		} catch (error) {
			console.error("Backend health check failed:", error);
			return { status: "ERROR", error };
		}
	}

	/**
	 * Upload files to Cloudinary
	 */
	async uploadFiles(files: { name: string; uri: string; type: string }[]) {
		try {
			console.log(`[API] Uploading ${files.length} file(s) to Cloudinary...`);

			// Convert file URIs to base64 if needed
			const processedFiles = await Promise.all(
				files.map(async (file) => {
					// If it's already a data URI or base64, use it as is
					if (file.uri.startsWith("data:") || file.uri.startsWith("base64,")) {
						return file;
					}

					// For React Native file URIs, read them as base64
					console.log(`[API] Reading file: ${file.uri}`);
					try {
						const base64 = await readAsStringAsync(file.uri, {
							encoding: "base64",
						});
						return {
							...file,
							uri: base64, // Send base64 string
						};
					} catch (readError) {
						console.error(`[API] Error reading file ${file.uri}:`, readError);
						return file; // Return original if read fails (will likely fail on backend but handled there)
					}
				})
			);

			const response = await fetchWithTimeout(
				`${API_BASE_URL}/api/upload`,
				{
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						"x-api-key": API_KEY,
					},
					body: JSON.stringify({
						files: processedFiles,
					}),
				},
				60000 // 60 second timeout for file uploads
			);

			if (!response.ok) {
				const error = await response.json();
				console.log("[API] Upload error:", error);
				return { success: false, error: error.message || "Upload failed" };
			}

			const result = await response.json();
			console.log("[API] Upload result:", result);
			return result;
		} catch (error: any) {
			console.error("[API] Upload error:", error.message || error);
			return { success: false, error: error.message || String(error) };
		}
	}

	/**
	 * Generic POST request
	 */
	async post(endpoint: string, data: any) {
		try {
			console.log(`[API] POST ${API_BASE_URL}${endpoint}`);
			const response = await fetchWithTimeout(
				`${API_BASE_URL}${endpoint}`,
				{
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						"x-api-key": API_KEY,
					},
					body: JSON.stringify(data),
				},
				30000
			);

			if (!response.ok) {
				const error = await response.json();
				console.log("[API] POST error:", error);
				return { success: false, error: error.error || "Request failed" };
			}

			const result = await response.json();
			console.log("[API] POST result:", result);
			return result;
		} catch (error: any) {
			console.error("[API] POST error:", error.message || error);
			throw error;
		}
	}

	/**
	 * POST request with FormData (for file uploads)
	 */
	async postFormData(endpoint: string, formData: FormData) {
		try {
			console.log(`[API] POST (FormData) ${API_BASE_URL}${endpoint}`);
			const response = await fetchWithTimeout(
				`${API_BASE_URL}${endpoint}`,
				{
					method: "POST",
					headers: {
						"x-api-key": API_KEY,
						// Don't set Content-Type for FormData - browser will set it with boundary
					},
					body: formData,
				},
				60000 // Longer timeout for file uploads
			);

			if (!response.ok) {
				const error = await response.json();
				console.log("[API] POST FormData error:", error);
				return { success: false, error: error.error || error.message || "Request failed" };
			}

			const result = await response.json();
			console.log("[API] POST FormData result:", result);
			return result;
		} catch (error: any) {
			console.error("[API] POST FormData error:", error.message || error);
			throw error;
		}
	}

	/**
	 * Generic GET method
	 */
	async get(endpoint: string) {
		try {
			console.log(`[API] GET ${API_BASE_URL}${endpoint}`);
			const response = await fetchWithTimeout(
				`${API_BASE_URL}${endpoint}`,
				{
					method: "GET",
					headers: {
						"Content-Type": "application/json",
						"x-api-key": API_KEY,
					},
				},
				30000
			);

			if (!response.ok) {
				// Clone the response so we can read it multiple times if needed
				const clonedResponse = response.clone();
				let error;
				try {
					error = await response.json();
				} catch (e) {
					// If JSON parse fails, get text from the clone
					const text = await clonedResponse.text();
					console.log("[API] GET error (non-JSON):", text);
					return { success: false, error: "Request failed", details: text };
				}
				console.log("[API] GET error:", error);
				return { success: false, error: error.error || "Request failed" };
			}

			// Clone the response for successful responses too
			const clonedResponse = response.clone();
			let result;
			try {
				result = await response.json();
			} catch (e) {
				// If JSON parse fails, get text from the clone
				const text = await clonedResponse.text();
				console.error("[API] GET response is not JSON:", text);
				throw new Error(`Invalid JSON response: ${text.substring(0, 100)}`);
			}
			return result;
		} catch (error: any) {
			console.error("[API] GET error:", error.message || error);
			throw error;
		}
	}

	/**
	 * Generic PUT method
	 */
	async put(endpoint: string, data: any) {
		try {
			console.log(`[API] PUT ${API_BASE_URL}${endpoint}`);
			const response = await fetchWithTimeout(
				`${API_BASE_URL}${endpoint}`,
				{
					method: "PUT",
					headers: {
						"Content-Type": "application/json",
						"x-api-key": API_KEY,
					},
					body: JSON.stringify(data),
				},
				30000
			);

			if (!response.ok) {
				const error = await response.json();
				console.log("[API] PUT error:", error);
				return { success: false, error: error.error || "Request failed" };
			}

			const result = await response.json();
			console.log("[API] PUT result:", result);
			return result;
		} catch (error: any) {
			console.error("[API] PUT error:", error.message || error);
			throw error;
		}
	}

	/**
	 * Generic DELETE method
	 */
	async delete(endpoint: string) {
		try {
			console.log(`[API] DELETE ${API_BASE_URL}${endpoint}`);
			const response = await fetchWithTimeout(
				`${API_BASE_URL}${endpoint}`,
				{
					method: "DELETE",
					headers: {
						"Content-Type": "application/json",
						"x-api-key": API_KEY,
					},
				},
				30000
			);

			if (!response.ok) {
				const error = await response.json();
				console.log("[API] DELETE error:", error);
				return { success: false, error: error.error || "Request failed" };
			}

			const result = await response.json();
			console.log("[API] DELETE result:", result);
			return result;
		} catch (error: any) {
			console.error("[API] DELETE error:", error.message || error);
			throw error;
		}
	}

	/**
	 * Create Stripe subscription
	 */
	async createSubscription(userId: string, priceId: string) {
		try {
			console.log(`[API] Creating Stripe subscription for user ${userId}`);
			const response = await fetchWithTimeout(
				`${API_BASE_URL}/api/stripe/create-subscription`,
				{
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						"x-api-key": API_KEY,
					},
					body: JSON.stringify({ userId, priceId }),
				},
				30000
			);

			if (!response.ok) {
				const error = await response.json();
				console.log("[API] Subscription creation error:", error);
				return { success: false, error: error.error || "Failed to create subscription" };
			}

			const result = await response.json();
			return { success: true, ...result };
		} catch (error: any) {
			console.error("[API] Subscription creation error:", error);
			return { success: false, error: error.message || String(error) };
		}
	}

	/**
	 * Create Payment Intent (for one-time payment)
	 */
	async createPaymentIntent(userId: string, amount: number) {
		try {
			console.log(`[API] Creating payment intent for user ${userId}, amount: ${amount}`);
			const response = await fetchWithTimeout(
				`${API_BASE_URL}/api/stripe/create-payment-intent`,
				{
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						"x-api-key": API_KEY,
					},
					body: JSON.stringify({ userId, amount }),
				},
				30000
			);

			if (!response.ok) {
				const error = await response.json();
				console.log("[API] Payment intent error:", error);
				return { success: false, error: error.error || "Failed to create payment intent" };
			}

			const result = await response.json();
			return { success: true, ...result };
		} catch (error: any) {
			console.error("[API] Payment intent error:", error);
			return { success: false, error: error.message || String(error) };
		}
	}

	/**
	 * Cancel Stripe subscription
	 */
	async cancelSubscription(subscriptionId: string, userId: string) {
		try {
			console.log(`[API] Cancelling subscription ${subscriptionId}`);
			const response = await fetchWithTimeout(
				`${API_BASE_URL}/api/stripe/cancel-subscription`,
				{
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						"x-api-key": API_KEY,
					},
					body: JSON.stringify({ subscriptionId, userId }),
				},
				30000
			);

			if (!response.ok) {
				const error = await response.json();
				console.log("[API] Subscription cancellation error:", error);
				return { success: false, error: error.error || "Failed to cancel subscription" };
			}

			const result = await response.json();
			console.log("[API] Subscription cancelled:", result);
			return result;
		} catch (error: any) {
			console.error("[API] Subscription cancellation error:", error.message || error);
			return { success: false, error: error.message || String(error) };
		}
	}

	/**
	 * Get user subscriptions
	 */
	async getUserSubscriptions(userId: string) {
		try {
			console.log(`[API] Getting subscriptions for user ${userId}`);
			const response = await fetchWithTimeout(
				`${API_BASE_URL}/api/stripe/user-subscriptions/${userId}`,
				{
					method: "GET",
					headers: {
						"Content-Type": "application/json",
						"x-api-key": API_KEY,
					},
				},
				30000
			);

			if (!response.ok) {
				const error = await response.json();
				console.log("[API] Get subscriptions error:", error);
				return { success: false, error: error.error || "Failed to get subscriptions" };
			}

			const result = await response.json();
			console.log("[API] Subscriptions retrieved:", result);
			return result;
		} catch (error: any) {
			console.error("[API] Get subscriptions error:", error.message || error);
			return { success: false, error: error.message || String(error) };
		}
	}
}

export const apiService = new ApiService();
export default apiService;
