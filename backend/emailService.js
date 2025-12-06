const nodemailer = require("nodemailer");

// Create reusable transporter
const transporter = nodemailer.createTransport({
	host: process.env.SMTP_HOST,
	port: parseInt(process.env.SMTP_PORT || "587"),
	secure: process.env.SMTP_SECURE === "true", // true for 465, false for other ports
	auth: {
		user: process.env.SMTP_USER,
		pass: process.env.SMTP_PASS,
	},
});

// Verify connection configuration
transporter.verify(function (error, success) {
	if (error) {
		console.error("SMTP connection error:", error);
	} else {
		console.log("SMTP server is ready to send emails");
	}
});

/**
 * Send email notification when a user joins a study group
 */
async function sendJoinNotification(groupData, newMembers, existingMembers) {
	try {
		const newMemberEmails = newMembers.map((m) => m.email).join(", ");

		const emailPromises = existingMembers.map((member) => {
			return transporter.sendMail({
				from: `"${process.env.FROM_NAME}" <${process.env.FROM_EMAIL}>`,
				to: member.email,
				subject: `New member joined ${groupData.name}`,
				html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0;">
              <h1 style="color: white; margin: 0; font-size: 24px;">New Member Alert! 🎉</h1>
            </div>
            
            <div style="background-color: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
              <p style="font-size: 16px; color: #374151; line-height: 1.6;">
                Great news! Someone new has joined your study group <strong>${groupData.name
					}</strong>.
              </p>
              
              <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #667eea;">
                <p style="margin: 0 0 10px 0; color: #1f2937;"><strong>👤 New member(s):</strong> ${newMemberEmails}</p>
                <p style="margin: 0 0 10px 0; color: #1f2937;"><strong>📚 Group:</strong> ${groupData.name
					}</p>
                <p style="margin: 0 0 10px 0; color: #1f2937;"><strong>📖 Class:</strong> ${groupData.className || "N/A"
					}</p>
                <p style="margin: 0; color: #1f2937;"><strong>🏫 School:</strong> ${groupData.school || "N/A"
					}</p>
              </div>
              
              <p style="font-size: 16px; color: #374151; margin-top: 20px;">
                Open your <strong>CauseAI</strong> app to welcome them and start collaborating!
              </p>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${process.env.APP_URL
					}" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">
                  Open CauseAI
                </a>
              </div>
            </div>
            
            <div style="text-align: center; margin-top: 20px; padding: 20px;">
              <p style="font-size: 12px; color: #6b7280; margin: 0;">
                You're receiving this because you're a member of this study group.
              </p>
              <p style="font-size: 12px; color: #6b7280; margin: 5px 0 0 0;">
                CauseAI - Empowering Students to Learn Together
              </p>
            </div>
          </div>
        `,
				text: `New member joined ${groupData.name
					}: ${newMemberEmails}. Group: ${groupData.name}, Class: ${groupData.className || "N/A"
					}, School: ${groupData.school || "N/A"
					}. Open your CauseAI app to see details.`,
			});
		});

		await Promise.all(emailPromises);
		console.log(
			`✓ Sent ${emailPromises.length} join notifications for group ${groupData.name}`
		);
		return { success: true, emailsSent: emailPromises.length };
	} catch (error) {
		console.error("Error sending join notification:", error);
		throw error;
	}
}

/**
 * Send email notification when a new message is posted
 */
async function sendMessageNotification(groupData, message, recipients) {
	try {
		const emailPromises = recipients.map((member) => {
			return transporter.sendMail({
				from: `"${process.env.FROM_NAME}" <${process.env.FROM_EMAIL}>`,
				to: member.email,
				subject: `New message in ${groupData.name}`,
				html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0;">
              <h1 style="color: white; margin: 0; font-size: 24px;">💬 New Message in ${groupData.name
					}</h1>
            </div>
            
            <div style="background-color: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
              <div style="margin-bottom: 20px;">
                <p style="font-size: 14px; color: #6b7280; margin: 0 0 5px 0;">From</p>
                <p style="font-size: 16px; color: #1f2937; margin: 0; font-weight: 600;">${message.senderEmail
					}</p>
              </div>
              
              <div style="background-color: #f9fafb; padding: 20px; border-radius: 8px; border-left: 4px solid #667eea;">
                <p style="margin: 0; color: #374151; white-space: pre-wrap; line-height: 1.6; font-size: 15px;">${message.message
					}</p>
              </div>
              
              ${message.attachments && message.attachments.length > 0
						? `
                <div style="margin-top: 20px; background-color: #f0f9ff; border: 2px dashed #0ea5e9; border-radius: 8px; padding: 20px;">
                  <div style="display: flex; align-items: center; margin-bottom: 10px;">
                    <span style="font-size: 24px; margin-right: 10px;">📎</span>
                    <strong style="color: #0369a1; font-size: 16px;">${message.attachments.length
						} File${message.attachments.length > 1 ? "s" : ""
						} Attached</strong>
                  </div>
                  ${message.attachments
							.map(
								(att) => `
                    <div style="background-color: #ffffff; padding: 12px; margin: 8px 0; border-radius: 6px; border-left: 3px solid #0ea5e9;">
                      <p style="margin: 0; color: #1e293b; font-weight: 600; font-size: 14px;">📄 ${att.name
									}</p>
                      <p style="margin: 5px 0 0 0; color: #64748b; font-size: 12px;">${att.type || "Unknown type"
									}</p>
                      ${att.url
										? `
                      <a href="${att.url}" style="display: inline-block; margin-top: 8px; padding: 6px 12px; background-color: #0ea5e9; color: white; text-decoration: none; border-radius: 4px; font-size: 12px; font-weight: 600;">
                        ⬇️ Download
                      </a>
                      `
										: ""
									}
                    </div>
                  `
							)
							.join("")}
                  ${!message.attachments.some((att) => att.url)
							? `
                  <p style="margin: 15px 0 0 0; color: #0369a1; font-size: 13px; font-style: italic;">
                    ⚠️ Open the CauseAI app to view these attachments
                  </p>
                  `
							: ""
						}
                </div>
              `
						: ""
					}
              
              <p style="font-size: 16px; color: #374151; margin-top: 25px;">
                Open your <strong>CauseAI</strong> app to reply and view the full conversation.
              </p>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${process.env.APP_URL
					}" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">
                  Reply in CauseAI
                </a>
              </div>
            </div>
            
            <div style="text-align: center; margin-top: 20px; padding: 20px;">
              <p style="font-size: 12px; color: #6b7280; margin: 0;">
                You're receiving this because you're a member of this study group.
              </p>
              <p style="font-size: 12px; color: #6b7280; margin: 5px 0 0 0;">
                CauseAI - Empowering Students to Learn Together
              </p>
            </div>
          </div>
        `,
				text: `New message in ${groupData.name} from ${message.senderEmail}: ${message.message
					}${message.attachments && message.attachments.length > 0
						? `\n\nAttachments (${message.attachments.length
						}):\n${message.attachments
							.map((att) => `- ${att.name} (${att.type || "Unknown type"})`)
							.join("\n")}\n\nOpen the CauseAI app to view attachments.`
						: ""
					}`,
			});
		});

		await Promise.all(emailPromises);
		console.log(
			`✓ Sent ${emailPromises.length} message notifications for group ${groupData.name}`
		);
		return { success: true, emailsSent: emailPromises.length };
	} catch (error) {
		console.error("Error sending message notification:", error);
		throw error;
	}
}

/**
 * Send welcome email when user creates a group
 */
async function sendGroupCreatedNotification(creatorEmail, groupData) {
	try {
		await transporter.sendMail({
			from: `"${process.env.FROM_NAME}" <${process.env.FROM_EMAIL}>`,
			to: creatorEmail,
			subject: `Study group "${groupData.name}" created successfully!`,
			html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 24px;">🎉 Group Created Successfully!</h1>
          </div>
          
          <div style="background-color: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
            <p style="font-size: 16px; color: #374151; line-height: 1.6;">
              Congratulations! Your study group <strong>${groupData.name
				}</strong> is now ready.
            </p>
            
            <div style="background-color: #ecfdf5; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #10b981;">
              <p style="margin: 0 0 10px 0; color: #1f2937;"><strong>📚 Group Name:</strong> ${groupData.name
				}</p>
              <p style="margin: 0 0 10px 0; color: #1f2937;"><strong>📖 Class:</strong> ${groupData.className || "N/A"
				}</p>
              <p style="margin: 0 0 15px 0; color: #1f2937;"><strong>🏫 School:</strong> ${groupData.school || "N/A"
				}</p>
              <div style="background-color: #ffffff; padding: 15px; border-radius: 6px;">
                <p style="margin: 0 0 5px 0; color: #6b7280; font-size: 12px;">Share this code with your classmates:</p>
                <p style="margin: 0; font-size: 32px; font-weight: bold; color: #10b981; letter-spacing: 2px; font-family: monospace;">${groupData.code
				}</p>
              </div>
            </div>
            
            <p style="font-size: 16px; color: #374151; margin-top: 20px;">
              Share the group code with your classmates so they can join and start collaborating!
            </p>
          </div>
          
          <div style="text-align: center; margin-top: 20px; padding: 20px;">
            <p style="font-size: 12px; color: #6b7280; margin: 0;">
              CauseAI - Empowering Students to Learn Together
            </p>
          </div>
        </div>
      `,
			text: `Your study group "${groupData.name}" has been created! Group code: ${groupData.code}. Share this code with your classmates.`,
		});

		console.log(`✓ Sent group creation confirmation to ${creatorEmail}`);
		return { success: true };
	} catch (error) {
		console.error("Error sending group creation notification:", error);
		throw error;
	}
}

module.exports = {
	sendJoinNotification,
	sendMessageNotification,
	sendGroupCreatedNotification,
	transporter,
};
