const { safeError } = require("../utils/errorResponse");
const { uploadFromBuffer } = require("../config/cloudinary");

const uploadFiles = async (req, res) => {
	try {
		const { files } = req.body;

		if (!files || !Array.isArray(files) || files.length === 0) {
			return res.status(400).json({
				error: "Missing required field: files array",
			});
		}

		const ALLOWED_MIME_TYPES = new Set([
			'image/jpeg', 'image/png', 'image/gif', 'image/webp',
			'application/pdf',
		]);
		const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

		const uploadPromises = files.map(async (file) => {
			try {
				// Validate MIME type
				if (!file.type || !ALLOWED_MIME_TYPES.has(file.type)) {
					return { name: file.name, error: `File type '${file.type}' is not allowed` };
				}

				// file should have: { name, uri (base64 or data URI), type }
				let buffer;

				if (file.uri.startsWith("data:")) {
					// Data URI format: data:image/png;base64,iVBORw0KG...
					const base64Data = file.uri.split(",")[1];
					buffer = Buffer.from(base64Data, "base64");
				} else {
					// Already base64
					buffer = Buffer.from(file.uri, "base64");
				}

				// Validate decoded size
				if (buffer.length > MAX_FILE_SIZE_BYTES) {
					return { name: file.name, error: `File exceeds maximum size of 10MB` };
				}

				const result = await uploadFromBuffer(buffer, file.name, file.type);

				return {
					name: file.name,
					url: result.secure_url,
					publicId: result.public_id,
					type: file.type,
					size: result.bytes,
				};
			} catch (error) {
				console.error(`Error uploading file ${file.name}:`, error);
				return {
					name: file.name,
					error: error.message,
				};
			}
		});

		const uploadedFiles = await Promise.all(uploadPromises);
		const successful = uploadedFiles.filter((f) => !f.error);
		const failed = uploadedFiles.filter((f) => f.error);

		res.json({
			success: true,
			message: `Uploaded ${successful.length}/${files.length} files`,
			files: successful,
			failed: failed.length > 0 ? failed : undefined,
		});
	} catch (error) {
		console.error("Error in file upload:", error);
		return safeError(res, 500, "Failed to upload files", error);
	}
};

module.exports = {
    uploadFiles
};
