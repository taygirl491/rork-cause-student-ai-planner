const { google } = require('googleapis');
const readline = require('readline');

// Replace with your OAuth2 credentials from Google Cloud Console
const CLIENT_ID = process.env.GMAIL_CLIENT_ID || 'your-client-id-here';
const CLIENT_SECRET = process.env.GMAIL_CLIENT_SECRET || 'your-client-secret-here';
const REDIRECT_URI = process.env.GMAIL_REDIRECT_URI || 'http://localhost:3000/oauth2callback';

const oauth2Client = new google.auth.OAuth2(
    CLIENT_ID,
    CLIENT_SECRET,
    REDIRECT_URI
);

// Generate auth URL
const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: ['https://www.googleapis.com/auth/gmail.send'],
    prompt: 'consent' // Force to get refresh token
});

console.log('\n========================================');
console.log('Gmail API Token Generator');
console.log('========================================\n');
console.log('1. Visit this URL in your browser:\n');
console.log(authUrl);
console.log('\n2. Authorize the app');
console.log('3. Copy the authorization code from the URL\n');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

rl.question('Enter the authorization code here: ', async (code) => {
    rl.close();

    try {
        const { tokens } = await oauth2Client.getToken(code);

        console.log('\n========================================');
        console.log('✓ Success! Tokens generated');
        console.log('========================================\n');
        console.log('Add these to your .env file:\n');
        console.log('GMAIL_REFRESH_TOKEN=' + tokens.refresh_token);
        console.log('\n========================================\n');

        if (tokens.access_token) {
            console.log('Access token (for testing):', tokens.access_token);
        }

        console.log('\nFull tokens object:');
        console.log(JSON.stringify(tokens, null, 2));

    } catch (error) {
        console.error('\n✗ Error retrieving access token:', error.message);
        console.error('\nFull error:', error);
    }
});
