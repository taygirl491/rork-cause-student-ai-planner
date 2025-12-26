const { Resend } = require('resend');

// Validate required environment variable
if (!process.env.RESEND_API_KEY) {
  console.error('❌ Missing required environment variable: RESEND_API_KEY');
  console.error('⚠️  Email service will not function properly!');
  console.error('Get your API key from: https://resend.com/api-keys');
}

const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * Send an announcement email to a list of recipients
 */
async function sendAnnouncement(recipientEmails, subject, bodyContent) {
  try {
    // Resend recommends batching for large sends
    const BATCH_SIZE = 90;
    const batches = [];

    for (let i = 0; i < recipientEmails.length; i += BATCH_SIZE) {
      batches.push(recipientEmails.slice(i, i + BATCH_SIZE));
    }

    console.log(`Sending announcement to ${recipientEmails.length} users in ${batches.length} batches.`);

    let sentCount = 0;

    for (const batch of batches) {
      const { data, error } = await resend.emails.send({
        from: `${process.env.FROM_NAME || 'CauseAI'} <onboarding@resend.dev>`, // Use Resend's verified domain
        to: batch,
        subject: subject,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0;">
              <h1 style="color: white; margin: 0; font-size: 24px;">📢 Announcement</h1>
            </div>
            
            <div style="background-color: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
              <h2 style="color: #1f2937; margin-top: 0;">${subject}</h2>
              
              <div style="font-size: 16px; color: #374151; line-height: 1.6; margin: 20px 0; white-space: pre-wrap;">${bodyContent}</div>
              
              <p style="font-size: 16px; color: #374151; margin-top: 30px; border-top: 1px solid #eee; padding-top: 20px;">
                Happy studying! 📖<br/>
                <strong>The CauseAI Team</strong>
              </p>
            </div>
            
            <div style="text-align: center; margin-top: 20px; padding: 20px;">
              <p style="font-size: 12px; color: #6b7280; margin: 0;">
                You are receiving this announcement as a registered user of CauseAI.
              </p>
            </div>
          </div>
        `,
      });

      if (error) {
        console.error('Resend API error:', error);
        return { success: false, error: error.message };
      }

      sentCount += batch.length;
      console.log(`✓ Sent batch of ${batch.length} emails via Resend`);
    }

    return { success: true, count: sentCount };
  } catch (error) {
    console.error('Error sending announcement via Resend:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Send welcome email to new users
 */
async function sendWelcomeEmail(email, name) {
  try {
    const { data, error } = await resend.emails.send({
      from: `${process.env.FROM_NAME || 'CauseAI'} <onboarding@resend.dev>`, // Use Resend's verified domain,
      to: email,
      subject: 'Welcome to CauseAI Student Planner! 🎉',
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
            
            <p style="font-size: 16px; color: #374151; margin-top: 30px;">
              Happy studying! 📖<br/>
              <strong>The CauseAI Team</strong>
            </p>
          </div>
        </div>
      `,
    });

    if (error) {
      console.error('Resend API error:', error);
      return { success: false, error: error.message };
    }

    console.log(`✓ Sent welcome email to ${email} via Resend`);
    return { success: true };
  } catch (error) {
    console.error('Error sending welcome email via Resend:', error);
    return { success: false, error: error.message };
  }
}

module.exports = {
  sendAnnouncement,
  sendWelcomeEmail,
};
