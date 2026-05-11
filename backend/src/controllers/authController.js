const { safeError } = require("../utils/errorResponse");
const emailService = require("../services/emailService");

const sendWelcomeEmail = async (req, res) => {
	try {
		const { email, name } = req.body;

		if (!email || !name) {
			return res.status(400).json({
				error: "Missing required fields: email and name",
			});
		}

		console.log(`📧 Welcome email request for: ${email}`);

		// Send welcome email and wait for result
		try {
			const result = await emailService.sendWelcomeEmail(email, name);
			console.log(`✓ Welcome email sent successfully to ${email}`);

			res.json({
				success: true,
				message: "Welcome email sent successfully",
				messageId: result.messageId
			});
		} catch (emailError) {
			console.error(`✗ Failed to send welcome email to ${email}:`, emailError.message);

			// Return error but don't fail the signup
			res.status(500).json({
				success: false,
				error: "Failed to send welcome email",
				details: emailError.message,
				// Include helpful debugging info
				hint: !process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD
					? "Email service may not be configured. Check GMAIL_USER and GMAIL_APP_PASSWORD environment variables."
					: "Check server logs for detailed error information."
			});
		}
	} catch (error) {
		console.error("Error in welcome email endpoint:", error);
		return safeError(res, 500, "Failed to process welcome email request", error);
	}
};

module.exports = {
    sendWelcomeEmail
};
