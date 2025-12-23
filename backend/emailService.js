const nodemailer = require("nodemailer");

// Create reusable transporter with low-overhead connection pooling
const transporter = nodemailer.createTransport({
  pool: true, // Enable connection pooling
  maxConnections: 5, // Limit concurrent connections to avoid rate limiting
  maxMessages: 100, // Limit messages per connection
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || "587"),
  secure: process.env.SMTP_SECURE === "true",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
  // Add timeouts to fail fast and allow retries rather than hanging
  connectionTimeout: 10000, // 10 seconds
  greetingTimeout: 5000,    // 5 seconds
  socketTimeout: 30000,     // 30 seconds
});

// Verify connection configuration
transporter.verify(function (error, success) {
  if (error) {
    console.error("SMTP connection error:", error);
  } else {
    console.log("SMTP server is ready to send emails (Pooling Enabled)");
  }
});

/**
 * Helper to send email with retry logic
 */
async function sendMailWithRetry(mailOptions, retries = 3) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await transporter.sendMail(mailOptions);
    } catch (error) {
      console.warn(`[Email] Attempt ${attempt} failed: ${error.message}`);

      if (attempt === retries) {
        throw error;
      }

      // Wait 1 second before retrying
      await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
    }
  }
}

/**
 * Send email notification when a user joins a study group
 */
async function sendJoinNotification(groupData, newMembers, existingMembers) {
  try {
    const newMemberEmails = newMembers.map((m) => m.email).join(", ");

    const emailPromises = existingMembers.map((member) => {
      const mailOptions = {
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
        text: `New member joined ${groupData.name}: ${newMemberEmails}. Group: ${groupData.name
          }, Class: ${groupData.className || "N/A"}, School: ${groupData.school || "N/A"
          }. Open your CauseAI app to see details.`,
      };

      return sendMailWithRetry(mailOptions);
    });

    await Promise.all(emailPromises);
    console.log(
      `✓ Sent ${emailPromises.length} join notifications for group ${groupData.name}`
    );
    return { success: true, emailsSent: emailPromises.length };
  } catch (error) {
    console.error("Error sending join notification:", error);
    // Don't throw error to avoid crashing the whole request if email fails, just log it
    // throw error; 
    return { success: false, error: error.message };
  }
}


/**
 * Send welcome email to new users on signup
 */
async function sendWelcomeEmail(email, name) {
  try {
    const mailOptions = {
      from: `"${process.env.FROM_NAME}" <${process.env.FROM_EMAIL}>`,
      to: email,
      subject: "Welcome to CauseAI Student Planner! 🎉",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px; border-radius: 10px 10px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 32px;">Welcome to CauseAI! 🎓</h1>
          </div>
          
          <div style="background-color: #ffffff; padding: 40px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
            <p style="font-size: 18px; color: #374151; margin-bottom: 20px;">
              Hi <strong>${name}</strong>,
            </p>
            
            <p style="font-size: 16px; color: #374151; line-height: 1.6;">
              Welcome to <strong>CauseAI Student Planner</strong>! We're thrilled to have you join our community of students who are taking control of their academic journey.
            </p>
            
            <div style="background-color: #f9fafb; padding: 25px; border-radius: 8px; margin: 30px 0;">
              <h2 style="color: #1f2937; font-size: 20px; margin-top: 0;">🚀 Get Started with These Features:</h2>
              
              <div style="margin: 15px 0;">
                <p style="margin: 8px 0; color: #374151;">
                  <strong style="color: #667eea;">📝 Smart Task Management</strong><br/>
                  <span style="font-size: 14px; color: #6b7280;">Organize assignments, exams, and projects with intelligent reminders</span>
                </p>
              </div>
              
              <div style="margin: 15px 0;">
                <p style="margin: 8px 0; color: #374151;">
                  <strong style="color: #667eea;">📚 Study Groups</strong><br/>
                  <span style="font-size: 14px; color: #6b7280;">Collaborate with classmates and share resources</span>
                </p>
              </div>
              
              <div style="margin: 15px 0;">
                <p style="margin: 8px 0; color: #374151;">
                  <strong style="color: #667eea;">🎯 Goal Tracking</strong><br/>
                  <span style="font-size: 14px; color: #6b7280;">Set and achieve your academic goals with habit tracking</span>
                </p>
              </div>
              
              <div style="margin: 15px 0;">
                <p style="margin: 8px 0; color: #374151;">
                  <strong style="color: #667eea;">🤖 AI Study Buddy</strong><br/>
                  <span style="font-size: 14px; color: #6b7280;">Get instant help with homework and study questions</span>
                </p>
              </div>
              
              <div style="margin: 15px 0;">
                <p style="margin: 8px 0; color: #374151;">
                  <strong style="color: #667eea;">📅 Class Scheduling</strong><br/>
                  <span style="font-size: 14px; color: #6b7280;">Keep track of your classes and sync with your calendar</span>
                </p>
              </div>
            </div>
            
            <p style="font-size: 16px; color: #374151; line-height: 1.6; margin-top: 30px;">
              We're here to help you succeed. If you have any questions or need assistance, don't hesitate to reach out!
            </p>
            
            <p style="font-size: 16px; color: #374151; margin-top: 30px;">
              Happy studying! 📖<br/>
              <strong>The CauseAI Team</strong>
            </p>
          </div>
          
          <div style="text-align: center; margin-top: 20px; padding: 20px;">
            <p style="font-size: 12px; color: #6b7280; margin: 0;">
              CauseAI - Empowering Students to Learn Together
            </p>
          </div>
        </div>
      `,
      text: `Welcome to CauseAI Student Planner!\n\nHi ${name},\n\nWelcome to CauseAI Student Planner! We're thrilled to have you join our community.\n\nGet started with these features:\n- Smart Task Management: Organize assignments, exams, and projects\n- Study Groups: Collaborate with classmates\n- Goal Tracking: Set and achieve your academic goals\n- AI Study Buddy: Get instant help with homework\n- Class Scheduling: Keep track of your classes\n\nHappy studying!\nThe CauseAI Team`,
    };

    await sendMailWithRetry(mailOptions);

    console.log(`✓ Sent welcome email to ${email}`);
    return { success: true };
  } catch (error) {
    console.error("Error sending welcome email:", error);
    // Don't throw, return failure
    return { success: false, error: error.message };
  }
}

/**
 * Send welcome email when user creates a group
 */
async function sendGroupCreatedNotification(creatorEmail, groupData) {
  try {
    const mailOptions = {
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
    };

    await sendMailWithRetry(mailOptions);

    console.log(`✓ Sent group creation confirmation to ${creatorEmail}`);
    return { success: true };
  } catch (error) {
    console.error("Error sending group creation notification:", error);
    // Don't throw, return failure
    return { success: false, error: error.message };
  }
}

module.exports = {
  sendJoinNotification,
  sendWelcomeEmail,
  sendGroupCreatedNotification,
  transporter,
};
