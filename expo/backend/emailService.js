const nodemailer = require('nodemailer');

/**
 * Check if email service is properly configured
 */
function checkEmailConfig() {
  const config = {
    hasGmailUser: !!process.env.GMAIL_USER,
    hasGmailPassword: !!process.env.GMAIL_APP_PASSWORD,
    gmailUser: process.env.GMAIL_USER ? process.env.GMAIL_USER.substring(0, 3) + '***' : 'NOT SET'
  };

  console.log('📧 Email Service Configuration:');
  console.log('  GMAIL_USER:', config.hasGmailUser ? '✓ Set (' + config.gmailUser + ')' : '✗ NOT SET');
  console.log('  GMAIL_APP_PASSWORD:', config.hasGmailPassword ? '✓ Set' : '✗ NOT SET');

  if (!config.hasGmailUser || !config.hasGmailPassword) {
    console.warn('⚠️  WARNING: Email service is not properly configured!');
    console.warn('   Please set GMAIL_USER and GMAIL_APP_PASSWORD environment variables.');
    return false;
  }

  return true;
}

/**
 * Create a transporter using Gmail service
 */
const createTransporter = () => {
  return nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false, // Use STARTTLS
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD
    },
    // Connection settings to prevent timeouts
    pool: true, // Use connection pooling
    maxConnections: 5,
    maxMessages: 100,
    rateDelta: 1000,
    rateLimit: 5,
    // Timeout settings
    connectionTimeout: 60000, // 60 seconds
    greetingTimeout: 30000, // 30 seconds
    socketTimeout: 60000, // 60 seconds
    // TLS options
    tls: {
      rejectUnauthorized: true,
      minVersion: 'TLSv1.2'
    },
    // Debug logging
    logger: process.env.NODE_ENV === 'development',
    debug: process.env.NODE_ENV === 'development'
  });
};

/**
 * Verify email service connection
 */
async function verifyEmailService() {
  try {
    if (!checkEmailConfig()) {
      return { success: false, error: 'Email service not configured' };
    }

    const transporter = createTransporter();
    await transporter.verify();
    console.log('✓ Email service connection verified');
    return { success: true };
  } catch (error) {
    console.error('✗ Email service verification failed:', error.message);
    return { success: false, error: error.message };
  }
}



/**
 * Send a welcome email to a new user
 * @param {string} to - Recipient email address
 * @param {string} name - Recipient name
 */
async function sendWelcomeEmail(to, name) {
  try {
    console.log(`📧 Attempting to send welcome email to: ${to}`);

    // Check configuration
    if (!checkEmailConfig()) {
      throw new Error('Email service not configured. Please set GMAIL_USER and GMAIL_APP_PASSWORD environment variables.');
    }

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

    console.log('📤 Sending email...');
    const info = await transporter.sendMail(mailOptions);
    console.log('✓ Welcome email sent successfully!');
    console.log('  Message ID:', info.messageId);
    console.log('  Recipient:', to);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('✗ Error sending welcome email:');
    console.error('  Error type:', error.name);
    console.error('  Error message:', error.message);
    console.error('  Recipient:', to);
    if (error.code) console.error('  Error code:', error.code);
    if (error.command) console.error('  SMTP command:', error.command);
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
 * Send notification for group join (Email version)
 */
async function sendJoinNotification(groupData, newMembers, existingMembers) {
  try {
    const recipients = existingMembers.map(m => m.email);
    if (recipients.length === 0) return { success: true, emailsSent: 0 };

    const newMemberNames = newMembers.map(m => m.name || m.email).join(', ');
    const subject = `New Member in ${groupData.name}`;
    const message = `
      <h1>New Member Joined! 🎉</h1>
      <p><strong>${newMemberNames}</strong> just joined your study group <strong>${groupData.name}</strong>.</p>
      <p>Go say hi in the group chat!</p>
    `;

    return await sendBroadcastEmail(recipients, subject, message);
  } catch (error) {
    console.error('Error sending join email notification:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Send notification for group creation (Email version)
 */
async function sendGroupCreatedNotification(to, groupData) {
  try {
    const transporter = createTransporter();
    const mailOptions = {
      from: `"CauseAI Student Planner" <${process.env.GMAIL_USER}>`,
      to: to,
      subject: `Study Group Created: ${groupData.name} 📚`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #6366F1;">Group Created Successfully! 🎉</h1>
          <p>Your study group <strong>${groupData.name}</strong> for <strong>${groupData.className}</strong> has been created.</p>
          <p>Invite your classmates using this code: <strong style="font-size: 20px; color: #6366F1;">${groupData.code}</strong></p>
          <p>Happy studying!</p>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    console.log(`✓ Group creation email sent to ${to}`);
    return { success: true };
  } catch (error) {
    console.error('Error sending group creation email:', error);
    return { success: false, error: error.message };
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
  sendTestEmail,
  sendJoinNotification,
  sendGroupCreatedNotification,
  checkEmailConfig,
  verifyEmailService
};
