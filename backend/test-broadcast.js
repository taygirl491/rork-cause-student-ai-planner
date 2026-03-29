require('dotenv').config();
const { sendBroadcastEmail } = require('./emailService');

const recipient = process.env.TEST_EMAIL || process.env.GMAIL_USER;
console.log('Sending test broadcast to:', recipient);

if (!recipient) {
    console.error('No recipient found. Set TEST_EMAIL or GMAIL_USER in .env');
    process.exit(1);
}

// Mock socket.io for progress updates
const mockIo = {
    emit: (event, data) => console.log(`[Socket] ${event}:`, JSON.stringify(data))
};

console.log('Starting broadcast test...');
sendBroadcastEmail([recipient], 'Test Announcement from Backend', '<h1>It Works!</h1><p>This is a test broadcast triggered manually from the backend.</p>', mockIo)
    .then(res => {
        console.log('Broadcast completed successfully!');
        console.log('Result:', res);
    })
    .catch(err => {
        console.error('Broadcast failed!');
        console.error(err);
    });
