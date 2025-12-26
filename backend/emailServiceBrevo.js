const SibApiV3Sdk = require('sib-api-v3-sdk');

// Validate required environment variable
if (!process.env.BREVO_API_KEY) {
    console.error('❌ Missing required environment variable: BREVO_API_KEY');
    console.error('⚠️  Email service will not function properly!');
    console.error('Get your API key from: https://app.brevo.com/settings/keys/api');
}

// Configure Brevo API
const defaultClient = SibApiV3Sdk.ApiClient.instance;
const apiKey = defaultClient.authentications['api-key'];
apiKey.apiKey = process.env.BREVO_API_KEY;

const apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();

/**
 * Send an announcement email to a list of recipients
 */
async function sendAnnouncement(recipientEmails, subject, bodyContent) {
    try {
        console.log(`Sending announcement to ${recipientEmails.length} users via Brevo...`);

        const sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail();

        sendSmtpEmail.sender = {
            name: process.env.FROM_NAME || 'CauseAI Study Groups',
            email: process.env.BREVO_SENDER_EMAIL || 'noreply@example.com'
        };

        sendSmtpEmail.to = recipientEmails.map(email => ({ email }));
        sendSmtpEmail.subject = subject;
        sendSmtpEmail.htmlContent = `
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
    `;

        const data = await apiInstance.sendTransacEmail(sendSmtpEmail);
        console.log(`✓ Sent announcement to ${recipientEmails.length} users via Brevo`);

        return { success: true, count: recipientEmails.length };
    } catch (error) {
        console.error('Error sending announcement via Brevo:', error);
        return { success: false, error: error.message || String(error) };
    }
}

/**
 * Send welcome email to new users
 */
async function sendWelcomeEmail(email, name) {
    try {
        const sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail();

        sendSmtpEmail.sender = {
            name: process.env.FROM_NAME || 'CauseAI Study Groups',
            email: process.env.BREVO_SENDER_EMAIL || 'noreply@example.com'
        };

        sendSmtpEmail.to = [{ email }];
        sendSmtpEmail.subject = 'Welcome to CauseAI Student Planner! 🎉';
        sendSmtpEmail.htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px; border-radius: 10px 10px 0 0; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 32px;">Welcome to CauseAI! 🎓</h1>
        </div>
        
        <div style="background-color: #ffffff; padding: 40px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
          <p style="font-size: 18px; color: #374151; margin-bottom: 20px;">
            Hi <strong>${name}</strong>,
          </p>
          
          <p style="font-size: 16px; color: #374151; line-height: 1.6;">
            Welcome to <strong>CauseAI Student Planner</strong>! We're thrilled to have you join our community.
          </p>
          
          <p style="font-size: 16px; color: #374151; margin-top: 30px;">
            Happy studying! 📖<br/>
            <strong>The CauseAI Team</strong>
          </p>
        </div>
      </div>
    `;

        await apiInstance.sendTransacEmail(sendSmtpEmail);
        console.log(`✓ Sent welcome email to ${email} via Brevo`);

        return { success: true };
    } catch (error) {
        console.error('Error sending welcome email via Brevo:', error);
        return { success: false, error: error.message || String(error) };
    }
}

module.exports = {
    sendAnnouncement,
    sendWelcomeEmail,
};
