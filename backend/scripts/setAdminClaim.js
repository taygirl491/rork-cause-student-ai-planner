#!/usr/bin/env node
/**
 * One-time script to set the Firebase admin custom claim.
 * Run from the backend directory: node scripts/setAdminClaim.js
 *
 * After running, the admin user must sign out and back in for the claim to take effect.
 * The claim is then checked in:
 *   - firestore.rules  (request.auth.token.admin == true)
 *   - app/_layout.tsx  (tokenResult.claims.admin)
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { admin } = require('../firebase');

const ADMIN_EMAIL = process.env.ADMIN_EMAIL;

if (!ADMIN_EMAIL) {
    console.error('Error: ADMIN_EMAIL is not set in backend/.env');
    console.error('Add:  ADMIN_EMAIL=your-admin@example.com');
    process.exit(1);
}

async function setAdminClaim() {
    try {
        const user = await admin.auth().getUserByEmail(ADMIN_EMAIL);
        await admin.auth().setCustomUserClaims(user.uid, { admin: true });
        console.log(`✓ Admin claim set for ${ADMIN_EMAIL} (uid: ${user.uid})`);
        console.log('  The admin user must sign out and back in for the claim to take effect.');
        process.exit(0);
    } catch (error) {
        if (error.code === 'auth/user-not-found') {
            console.error(`Error: No Firebase user found with email "${ADMIN_EMAIL}"`);
            console.error('  Create the account first via the app registration flow.');
        } else {
            console.error('Error setting admin claim:', error.message);
        }
        process.exit(1);
    }
}

setAdminClaim();
