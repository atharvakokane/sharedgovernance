#!/usr/bin/env node
/**
 * Migrates users from data/users.json to Firebase Auth + Firestore.
 * Run once to set up secure authentication. Requires Firebase Admin SDK.
 *
 * Prerequisites:
 *   1. Enable "Email/Password" sign-in in Firebase Console:
 *      Authentication → Sign-in method → Email/Password → Enable
 *   2. Create a service account key: Project Settings → Service accounts → Generate new private key
 *   3. Set GOOGLE_APPLICATION_CREDENTIALS to the path of the JSON key file
 *
 * Usage:
 *   node scripts/migrate-users-to-firebase.js
 *
 * Or with explicit credentials path:
 *   GOOGLE_APPLICATION_CREDENTIALS=./service-account.json node scripts/migrate-users-to-firebase.js
 */

const fs = require('fs');
const path = require('path');

async function main() {
  let admin;
  try {
    admin = require('firebase-admin');
  } catch (e) {
    console.error('Install firebase-admin: npm install firebase-admin');
    process.exit(1);
  }

  if (!admin.apps || admin.apps.length === 0) {
    const credPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
    if (!credPath || !fs.existsSync(credPath)) {
      console.error('Set GOOGLE_APPLICATION_CREDENTIALS to your service account JSON path.');
      console.error('Get it from: Firebase Console → Project Settings → Service accounts → Generate new private key');
      process.exit(1);
    }
    admin.initializeApp({ credential: admin.credential.cert(require(path.resolve(credPath))) });
  }

  const usersPath = path.join(__dirname, '..', 'data', 'users.json');
  if (!fs.existsSync(usersPath)) {
    console.error('data/users.json not found');
    process.exit(1);
  }

  const users = JSON.parse(fs.readFileSync(usersPath, 'utf8'));
  const emailSuffix = '@vt.edu';

  const auth = admin.auth();
  const db = admin.firestore();

  let created = 0;
  let skipped = 0;
  let errors = 0;

  for (const u of users) {
    const pid = String(u.pid || '').trim();
    const password = String(u.password || '');
    const role = u.role === 'admin' ? 'admin' : 'senator';

    if (!pid || !password) {
      console.warn('Skipping user with missing pid or password');
      skipped++;
      continue;
    }

    const email = pid.toLowerCase().includes('@') ? pid.toLowerCase() : pid.toLowerCase() + emailSuffix;
    const shortPid = email.split('@')[0];

    try {
      try {
        await auth.getUserByEmail(email);
        console.log('User exists:', email, '- skipping');
        skipped++;
      } catch (e) {
        if (e.code === 'auth/user-not-found') {
          await auth.createUser({
            email,
            password,
            emailVerified: true,
            displayName: shortPid
          });
          console.log('Created auth user:', email);
          created++;
        } else {
          throw e;
        }
      }

      const userRef = db.collection('users').doc(shortPid);
      const snap = await userRef.get();
      if (!snap.exists) {
        await userRef.set({ pid: shortPid, role });
        console.log('Created Firestore user doc:', shortPid, 'role:', role);
      }
    } catch (err) {
      console.error('Error for', pid, ':', err.message);
      errors++;
    }
  }

  console.log('\nDone. Created:', created, 'Skipped:', skipped, 'Errors:', errors);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
