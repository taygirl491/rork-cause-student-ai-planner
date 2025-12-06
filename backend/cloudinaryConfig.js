const cloudinary = require("cloudinary").v2;
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const multer = require("multer");

// Configure Cloudinary
cloudinary.config({
	cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
	api_key: process.env.CLOUDINARY_API_KEY,
	api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Configure multer storage for Cloudinary
const storage = new CloudinaryStorage({
	cloudinary: cloudinary,
	params: {
		folder: "causeai-study-groups", // Folder in Cloudinary
		resource_type: "auto", // Automatically detect file type
		allowed_formats: [
			"jpg",
			"jpeg",
			"png",
			"gif",
			"pdf",
			"doc",
			"docx",
			"txt",
			"zip",
			"ppt",
			"pptx",
			"xls",
			"xlsx",
		],
		public_id: (req, file) => {
			// Generate unique filename with timestamp
			const timestamp = Date.now();
			const originalName = file.originalname
				.split(".")[0]
				.replace(/[^a-zA-Z0-9]/g, "_");
			return `${timestamp}_${originalName}`;
		},
	},
});

const upload = multer({
	storage: storage,
	limits: {
		fileSize: 10 * 1024 * 1024, // 10MB limit
	},
});

/**
 * Upload file buffer to Cloudinary (for mobile app uploads)
 */
async function uploadFromBuffer(buffer, filename, mimetype) {
	return new Promise((resolve, reject) => {
		const uploadStream = cloudinary.uploader.upload_stream(
			{
				folder: "causeai-study-groups",
				resource_type: "auto",
				public_id: `${Date.now()}_${filename
					.split(".")[0]
					.replace(/[^a-zA-Z0-9]/g, "_")}`,
			},
			(error, result) => {
				if (error) {
					reject(error);
				} else {
					resolve(result);
				}
			}
		);
		uploadStream.end(buffer);
	});
}

/**
 * Delete file from Cloudinary
 */
async function deleteFile(publicId) {
	try {
		const result = await cloudinary.uploader.destroy(publicId);
		return result;
	} catch (error) {
		console.error("Error deleting file from Cloudinary:", error);
		throw error;
	}
}

/**
 * Generate a signed URL for secure file access (expires in 1 hour)
 */
function getSignedUrl(publicId) {
	return cloudinary.url(publicId, {
		secure: true,
		sign_url: true,
		type: "authenticated",
	});
}

module.exports = {
	cloudinary,
	upload,
	uploadFromBuffer,
	deleteFile,
	getSignedUrl,
};
