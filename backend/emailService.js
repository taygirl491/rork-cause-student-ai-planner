const nodemailer = require('nodemailer');

/**
 * Create a transporter using Gmail
 */
const createTransporter = () => {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD
    }
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
 */
async function sendBroadcastEmail(recipients, subject, message) {
  try {
    const transporter = createTransporter();

    const mailOptions = {
      from: `"CauseAI Student Planner" <${process.env.GMAIL_USER}>`,
      bcc: recipients, // Use BCC to hide recipients from each other
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

    const info = await transporter.sendMail(mailOptions);
    console.log('Broadcast email sent:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending broadcast email:', error);
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

module.exports = {
  sendWelcomeEmail,
  sendPasswordResetEmail,
  sendBroadcastEmail,
  sendTestEmail
};
