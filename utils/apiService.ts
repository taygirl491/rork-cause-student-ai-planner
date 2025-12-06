const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000";
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
	 * Send notification when a message is posted
	 */
	async notifyGroupMessage(groupId: string, messageId: string) {
		try {
			console.log(`[API] Calling ${API_BASE_URL}/api/notify/new-message`);
			console.log(`[API] Payload: groupId=${groupId}, messageId=${messageId}`);

			const response = await fetchWithTimeout(
				`${API_BASE_URL}/api/notify/new-message`,
				{
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						"x-api-key": API_KEY,
					},
					body: JSON.stringify({
						groupId,
						messageId,
					}),
				},
				30000
			);

			console.log("[API] Message response status:", response.status);

			if (!response.ok) {
				const error = await response.json();
				console.log("[API] Message response error:", error);
				return { success: false, error: error.message || "Request failed" };
			}

			const result = await response.json();
			console.log("[API] Message notification result:", result);
			return { success: true, ...result };
		} catch (error: any) {
			console.error(
				"[API] Message notification error:",
				error.message || error
			);
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

					// For React Native file URIs, we'll need to read them
					// This is a placeholder - you may need to use react-native-fs or expo-file-system
					console.log(`[API] File URI: ${file.uri}`);
					return file;
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
}

export default new ApiService();
