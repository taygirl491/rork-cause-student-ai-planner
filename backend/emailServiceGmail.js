const { google } = require('googleapis');

// OAuth2 credentials from environment variables
const CLIENT_ID = process.env.GMAIL_CLIENT_ID;
const CLIENT_SECRET = process.env.GMAIL_CLIENT_SECRET;
const REDIRECT_URI = process.env.GMAIL_REDIRECT_URI || 'http://localhost:3000/oauth2callback';
const REFRESH_TOKEN = process.env.GMAIL_REFRESH_TOKEN;

const oauth2Client = new google.auth.OAuth2(
    CLIENT_ID,
    CLIENT_SECRET,
    REDIRECT_URI
);

oauth2Client.setCredentials({
    refresh_token: REFRESH_TOKEN
});

async function sendEmail(to, subject, html) {
    try {
        const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

        // Create email in RFC 2822 format
        const email = [
            `To: ${to}`,
            `Subject: ${subject}`,
            'MIME-Version: 1.0',
            'Content-Type: text/html; charset=utf-8',
            '',
            html
        ].join('\n');

        // Encode email in base64
        const encodedEmail = Buffer.from(email)
            .toString('base64')
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=+$/, '');

        const result = await gmail.users.messages.send({
            userId: 'me',
            requestBody: {
                raw: encodedEmail
            }
        });

        return { success: true, messageId: result.data.id };
    } catch (error) {
        console.error('Gmail API error:', error);
        return { success: false, error: error.message };
    }
}

async function sendAnnouncement(recipientEmails, subject, bodyContent) {
    try {
        console.log(`Sending announcement to ${recipientEmails.length} users via Gmail API...`);

        const fromName = process.env.FROM_NAME || 'CauseAI';

        const html = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0;">
                    <h1 style="color: white; margin: 0; font-size: 24px;">📢 Announcement</h1>
                </div>
                
                <div style="background-color: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
                    <h2 style="color: #1f2937; margin-top: 0;">${subject}</h2>
                    <div style="font-size: 16px; color: #374151; line-height: 1.6; margin: 20px 0; white-space: pre-wrap;">${bodyContent}</div>
                    <p style="font-size: 16px; color: #374151; margin-top: 30px; border-top: 1px solid #eee; padding-top: 20px;">
                        Happy studying! 📖<br/>
                        <strong>The ${fromName} Team</strong>
                    </p>
                </div>
            </div>
        `;

        let successCount = 0;
        let failedEmails = [];

        // Send emails one by one (Gmail API has rate limits)
        for (const email of recipientEmails) {
            const result = await sendEmail(email, subject, html);
            if (result.success) {
                successCount++;
                console.log(`✓ Sent to ${email}`);
            } else {
                failedEmails.push(email);
                console.error(`✗ Failed to send to ${email}:`, result.error);
            }

            // Small delay to avoid rate limiting
            await new Promise(resolve => setTimeout(resolve, 100));
        }

        console.log(`✓ Broadcast complete: Sent to ${successCount}/${recipientEmails.length} users`);

        if (failedEmails.length > 0) {
            console.error(`Failed emails: ${failedEmails.join(', ')}`);
        }

        return {
            success: successCount > 0,
            count: successCount,
            failed: failedEmails
        };
    } catch (error) {
        console.error('Error sending announcement via Gmail API:', error);
        return { success: false, error: error.message || String(error) };
    }
}

async function sendWelcomeEmail(email, name) {
    try {
        const fromName = process.env.FROM_NAME || 'CauseAI';

        const html = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px; border-radius: 10px 10px 0 0; text-align: center;">
                    <h1 style="color: white; margin: 0; font-size: 32px;">Welcome to ${fromName}! 🎓</h1>
                </div>
                
                <div style="background-color: #ffffff; padding: 40px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
                    <p style="font-size: 18px; color: #374151; margin-bottom: 20px;">
                        Hi <strong>${name}</strong>,
                    </p>
                    <p style="font-size: 16px; color: #374151; line-height: 1.6;">
                        Welcome to <strong>${fromName} Student Planner</strong>! We're thrilled to have you join our community.
                    </p>
                    <p style="font-size: 16px; color: #374151; margin-top: 30px;">
                        Happy studying! 📖<br/>
                        <strong>The ${fromName} Team</strong>
                    </p>
                </div>
            </div>
        `;

        const result = await sendEmail(email, `Welcome to ${fromName}! 🎉`, html);

        if (result.success) {
            console.log(`✓ Sent welcome email to ${email}`);
        } else {
            console.error(`✗ Failed to send welcome email to ${email}:`, result.error);
        }

        return result;
    } catch (error) {
        console.error('Error sending welcome email via Gmail API:', error);
        return { success: false, error: error.message || String(error) };
    }
}

module.exports = {
    sendAnnouncement,
    sendWelcomeEmail,
};
