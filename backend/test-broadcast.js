require('dotenv').config();
const { connectMongoDB } = require('./mongodb');
const User = require('./models/User');
const emailService = require('./emailService');

async function test() {
    try {
        console.log('🔍 Testing Broadcast Email Configuration...\n');

        // Check environment variables
        console.log('📧 SMTP Configuration:');
        console.log('  SMTP_HOST:', process.env.SMTP_HOST || '❌ NOT SET');
        console.log('  SMTP_PORT:', process.env.SMTP_PORT || '❌ NOT SET');
        console.log('  SMTP_SECURE:', process.env.SMTP_SECURE || '❌ NOT SET');
        console.log('  SMTP_USER:', process.env.SMTP_USER || '❌ NOT SET');
        console.log('  SMTP_PASS:', process.env.SMTP_PASS ? `✓ SET (***${process.env.SMTP_PASS.slice(-4)})` : '❌ NOT SET');
        console.log('  FROM_EMAIL:', process.env.FROM_EMAIL || '❌ NOT SET');
        console.log('  FROM_NAME:', process.env.FROM_NAME || '❌ NOT SET');

        // Check for spaces in password (common issue)
        if (process.env.SMTP_PASS && process.env.SMTP_PASS.includes(' ')) {
            console.log('\n⚠️  WARNING: SMTP_PASS contains spaces! Gmail App Passwords should not have spaces.');
            console.log('   Current length:', process.env.SMTP_PASS.length);
            console.log('   Without spaces:', process.env.SMTP_PASS.replace(/\s/g, '').length);
        }

        console.log('\n🔌 Connecting to MongoDB...');
        await connectMongoDB();
        console.log('✓ MongoDB connected');

        console.log('\n👥 Checking users in database...');
        const users = await User.find({}, 'email name');
        console.log(`✓ Found ${users.length} users`);

        if (users.length === 0) {
            console.log('❌ No users found! Broadcast will fail with 404 error.');
        } else {
            console.log('\nSample users:');
            users.slice(0, 5).forEach((u, i) => {
                console.log(`  ${i + 1}. ${u.email} (${u.name || 'No name'})`);
            });

            // Validate email formats
            const validEmails = users.filter(u => u.email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(u.email));
            const invalidEmails = users.filter(u => !u.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(u.email));

            console.log(`\n✓ Valid emails: ${validEmails.length}`);
            if (invalidEmails.length > 0) {
                console.log(`⚠️  Invalid emails: ${invalidEmails.length}`);
                invalidEmails.forEach(u => {
                    console.log(`   - ${u.email || 'MISSING EMAIL'} (${u._id})`);
                });
            }
        }

        console.log('\n✅ Diagnostic complete!');
        console.log('\nNext steps:');
        console.log('1. If SMTP_PASS has spaces, remove them from .env file');
        console.log('2. Restart the backend server');
        console.log('3. Check server logs for "SMTP server is ready to send emails"');
        console.log('4. Try the broadcast email feature again');

    } catch (error) {
        console.error('\n❌ Error during diagnostic:', error.message);
        console.error(error.stack);
    } finally {
        process.exit(0);
    }
}

test();
