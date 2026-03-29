const http = require('http');

// Test if server is responding
const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/health',
    method: 'GET',
    timeout: 5000
};

const req = http.request(options, (res) => {
    console.log(`✓ Server responded with status: ${res.statusCode}`);
    let data = '';

    res.on('data', (chunk) => {
        data += chunk;
    });

    res.on('end', () => {
        console.log('Response:', data);
        process.exit(0);
    });
});

req.on('error', (error) => {
    console.error('✗ Connection failed:', error.message);
    process.exit(1);
});

req.on('timeout', () => {
    console.error('✗ Request timed out');
    req.destroy();
    process.exit(1);
});

req.end();
