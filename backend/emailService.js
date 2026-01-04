const nodemailer = require('nodemailer');

/**
 * Create a transporter using Gmail SMTP with explicit configuration
 * Using direct SMTP instead of 'service: gmail' for better control
 */
const createTransporter = () => {
  return nodemailer.createTransport({
    // Use explicit SMTP settings instead of 'service: gmail'
    host: 'smtp.gmail.com',
    port: 587, // Try 587 (STARTTLS) - most reliable for cloud servers
    secure: false, // true for 465, false for other ports
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD
    },
  });
};



/**
 * Send a welcome email to a new user
 * @param {string} to - Recipient email address
 * @param {string} name - Recipient name
 */
async function sendWelcomeEmail(to, name) {
  try {
    const transporter = createTransporter();

    const mailOptions = {
      from: `"CauseAI Student Planner" <${process.env.GMAIL_USER}>`,
      to: to,
      subject: 'Welcome to CauseAI Student Planner! 🎓',
      html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h1 style="color: #6366F1;">Welcome to CauseAI, ${name}! 🎉</h1>
                    <p>We're excited to have you on board!</p>
                    <p>CauseAI Student Planner helps you:</p>
                    <ul>
                        <li>📝 Manage your tasks and assignments</li>
                        <li>📚 Organize your classes</li>
                        <li>🎯 Track your goals</li>
                        <li>📓 Keep notes organized</li>
                        <li>👥 Collaborate in study groups</li>
                    </ul>
                    <p>Get started by creating your first task or joining a study group!</p>
                    <p style="margin-top: 30px;">
                        Best regards,<br>
                        <strong>The CauseAI Team</strong>
                    </p>
                </div>
            `
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Welcome email sent:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending welcome email:', error);
    throw error;
  }
}

/**
 * Send a password reset email
 * @param {string} to - Recipient email address
 * @param {string} resetLink - Password reset link
 */
async function sendPasswordResetEmail(to, resetLink) {
  try {
    const transporter = createTransporter();

    const mailOptions = {
      from: `"CauseAI Student Planner" <${process.env.GMAIL_USER}>`,
      to: to,
      subject: 'Reset Your Password - CauseAI',
      html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h1 style="color: #6366F1;">Reset Your Password</h1>
                    <p>You requested to reset your password for your CauseAI account.</p>
                    <p>Click the button below to reset your password:</p>
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="${resetLink}" 
                           style="background-color: #6366F1; color: white; padding: 12px 30px; 
                                  text-decoration: none; border-radius: 5px; display: inline-block;">
                            Reset Password
                        </a>
                    </div>
                    <p style="color: #666; font-size: 14px;">
                        If you didn't request this, you can safely ignore this email.
                    </p>
                    <p style="color: #666; font-size: 14px;">
                        This link will expire in 1 hour.
                    </p>
                </div>
            `
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Password reset email sent:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending password reset email:', error);
    throw error;
  }
}

/**
 * Send a broadcast email to multiple recipients
 * @param {string[]} recipients - Array of recipient email addresses
 * @param {string} subject - Email subject
 * @param {string} message - Email message (HTML)
 * @param {object} io - Socket.io instance for progress updates (optional)
 */
async function sendBroadcastEmail(recipients, subject, message, io = null) {
  try {
    const transporter = createTransporter();
    let successCount = 0;
    let failedEmails = [];

    // Emit start event
    if (io) {
      io.emit('broadcast-started', {
        total: recipients.length,
        subject: subject
      });
    }

    // Send emails one by one to track progress
    for (let i = 0; i < recipients.length; i++) {
      const recipient = recipients[i];

      try {
        const mailOptions = {
          from: `"CauseAI Student Planner" <${process.env.GMAIL_USER}>`,
          to: recipient,
          subject: subject,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              ${message}
              <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
              <p style="color: #666; font-size: 12px; text-align: center;">
                This email was sent from CauseAI Student Planner
              </p>
            </div>
          `
        };

        await transporter.sendMail(mailOptions);
        successCount++;

        // Emit progress event
        if (io) {
          io.emit('broadcast-progress', {
            current: i + 1,
            total: recipients.length,
            successCount: successCount,
            failedCount: failedEmails.length,
            lastSent: recipient
          });
        }

        console.log(`✓ Sent to ${recipient} (${i + 1}/${recipients.length})`);
      } catch (error) {
        failedEmails.push(recipient);
        console.error(`✗ Failed to send to ${recipient}:`, error.message);

        // Emit progress event even on failure
        if (io) {
          io.emit('broadcast-progress', {
            current: i + 1,
            total: recipients.length,
            successCount: successCount,
            failedCount: failedEmails.length,
            lastFailed: recipient
          });
        }
      }
    }

    const result = {
      success: successCount > 0,
      successCount: successCount,
      failedCount: failedEmails.length,
      total: recipients.length,
      failedEmails: failedEmails
    };

    // Emit completion event
    if (io) {
      io.emit('broadcast-complete', result);
    }

    console.log(`✓ Broadcast complete: Sent to ${successCount}/${recipients.length} users`);
    if (failedEmails.length > 0) {
      console.log(`✗ Failed emails: ${failedEmails.join(', ')}`);
    }

    return result;
  } catch (error) {
    console.error('Error sending broadcast email:', error);

    // Emit error event
    if (io) {
      io.emit('broadcast-error', {
        error: error.message
      });
    }

    throw error;
  }
}

/**
 * Send a test email
 * @param {string} to - Recipient email address
 */
async function sendTestEmail(to) {
  try {
    const transporter = createTransporter();

    const mailOptions = {
      from: `"CauseAI Student Planner" <${process.env.GMAIL_USER}>`,
      to: to,
      subject: 'Test Email from CauseAI',
      html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h1 style="color: #6366F1;">Email Service Test ✅</h1>
                    <p>This is a test email from CauseAI Student Planner.</p>
                    <p>If you're seeing this, your email service is working correctly!</p>
                    <p style="margin-top: 30px;">
                        <strong>Sent at:</strong> ${new Date().toLocaleString()}
                    </p>
                </div>
            `
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Test email sent:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending test email:', error);
    throw error;
  }
}

/**
 * Alias for sendBroadcastEmail (for compatibility with admin routes)
 */
const sendAnnouncement = sendBroadcastEmail;

module.exports = {
  sendWelcomeEmail,
  sendPasswordResetEmail,
  sendBroadcastEmail,
  sendAnnouncement,
  sendTestEmail
};
