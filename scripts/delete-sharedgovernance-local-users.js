#!/usr/bin/env node
/**
 * Deletes all Firebase Auth users with @sharedgovernance.local emails.
 * These were created before switching to @vt.edu format.
 *
 * Prerequisites: GOOGLE_APPLICATION_CREDENTIALS set to service account JSON path.
 *
 * Usage:
 *   GOOGLE_APPLICATION_CREDENTIALS=./service-account.json node scripts/delete-sharedgovernance-local-users.js
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
      process.exit(1);
    }
    admin.initializeApp({ credential: admin.credential.cert(require(path.resolve(credPath))) });
  }

  const auth = admin.auth();
  const targetSuffix = '@sharedgovernance.local';
  let deleted = 0;
  let nextPageToken;

  do {
    const listResult = await auth.listUsers(1000, nextPageToken);
    for (const user of listResult.users) {
      if (user.email && user.email.toLowerCase().endsWith(targetSuffix)) {
        await auth.deleteUser(user.uid);
        console.log('Deleted:', user.email);
        deleted++;
      }
    }
    nextPageToken = listResult.pageToken;
  } while (nextPageToken);

  console.log('\nDone. Deleted', deleted, 'user(s) with @sharedgovernance.local');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
