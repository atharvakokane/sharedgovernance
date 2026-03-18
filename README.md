# VT Shared Governance Tracker

A static web application for Virginia Tech Shared Governance appointees to log meeting attendance and notes. Built for deployment on GitHub Pages using only HTML, CSS, and vanilla JavaScript.

## Features

- **Authentication**: Secure login via Firebase Auth (passwords hashed, never stored in plaintext). User roles stored in Firestore.
- **Senator Dashboard**: View assigned committees and meetings; confirm attendance and submit notes
- **Admin Dashboard**: View all submissions, manage committee assignments, edit meetings, export data
- **Mobile-First**: Responsive design with hamburger menu on small screens

## File Structure

```
/
├── index.html          # Login page
├── dashboard.html      # Senator dashboard
├── admin.html          # Admin (cabinet) dashboard
├── firebase.json       # Firebase project config (for firestore deploy)
├── firestore.rules     # Firestore security rules
├── .firebaserc         # Firebase project ID
├── .nojekyll           # Disable Jekyll on GitHub Pages
├── css/
│   └── styles.css      # Shared styles
├── js/
│   ├── firebase-config.js    # Firebase config (required for auth & submissions)
│   ├── firebase-auth.js      # Firebase Auth (secure password verification)
│   ├── firebase-submissions.js # Firestore submissions
│   ├── utils.js        # Data loading, localStorage helpers
│   ├── auth.js         # Authentication, session management
│   ├── dashboard.js    # Senator dashboard logic
│   └── admin.js        # Admin dashboard logic
├── data/
│   ├── users.json.example   # Template for migration (copy to users.json for migration only)
│   ├── assignments.json # Senator-to-committee assignments
│   ├── meetings.json   # Meeting data (mirrors governance.vt.edu/UpcomingEvents)
│   └── committees.json # Allowed committees list (17 bodies)
├── security.txt        # Security contact (RFC 9116)
└── .well-known/
    └── security.txt   # Security contact (canonical)
```

## Data Files

### Authentication (Firebase Auth + Firestore)

User accounts are stored securely in Firebase Auth (passwords hashed) and Firestore (roles). To set up users:

1. **Enable Email/Password sign-in** in [Firebase Console](https://console.firebase.google.com/) → Authentication → Sign-in method
2. **Create a service account key**: Project Settings → Service accounts → Generate new private key. Save as `service-account.json` in the project root (do not commit).
3. **Create `data/users.json`** from `data/users.json.example` with your users (for migration only)
4. **Run the migration**:
   ```bash
   npm install
   set GOOGLE_APPLICATION_CREDENTIALS=./service-account.json   # Windows
   # or: export GOOGLE_APPLICATION_CREDENTIALS=./service-account.json   # Mac/Linux
   npm run migrate-users
   ```
5. **Delete `data/users.json`** after migration (it contains plaintext passwords)
6. **Deploy Firestore rules**: `firebase deploy --only firestore`

### assignments.json
```json
[
  { "pid": "12345678", "committees": ["Academic Affairs Committee", "Student Life Committee"] }
]
```

### meetings.json
Meeting data mirrors the [VT Governance Upcoming Events](https://governance.vt.edu/UpcomingEvents) calendar. Only meetings for allowed committees (see committees.json) are included.

```json
[
  {
    "id": "m1",
    "committee": "Commission on Faculty Affairs",
    "name": "Commission on Faculty Affairs Meeting",
    "date": "2025-02-27",
    "time": "10:30 AM - 12:00 PM",
    "location": "TBD"
  }
]
```

### committees.json
Defines the 17 allowed Shared Governance committees. Used for admin dropdowns and validation.

## Deployment on GitHub Pages

1. Push this repository to GitHub
2. Go to **Settings → Pages**
3. Set **Source** to **GitHub Actions**
4. Add the `FIREBASEAPI` secret (Settings → Secrets and variables → Actions) with your Firebase API key
5. The workflow deploys on every push to `main`

If the repo is named `sharedgovernance`, the app will be at `https://<username>.github.io/sharedgovernance/`

## Local Development

Serve the folder with any static server. For example:

```bash
# Python
python -m http.server 8000

# Node (npx)
npx serve .
```

Then open `http://localhost:8000` (or `http://localhost:8000/sharedgovernance` if in a subfolder).

## Default Credentials

After running the migration script with your `data/users.json`, users can sign in with their PID and password. There are no default credentials—create your own in `users.json` before migrating.

## Data Persistence

- **Submissions**: By default, stored in the browser's localStorage (per-device). To share submissions across all devices so admins can access them from any computer, configure **Firebase Firestore** (see below).
- **Assignments & meetings**: Admin edits are stored in localStorage. Use **Export** to backup.

## Firebase Setup (Required)

Firebase is required for authentication and optional shared submissions:

1. Create a project at [Firebase Console](https://console.firebase.google.com/)
2. Enable **Firestore Database** and **Authentication** (Email/Password sign-in)
3. Add your web app and copy the config to `js/firebase-config.template.js` (or use the deploy workflow with `FIREBASEAPI` secret)
4. **Deploy Firestore rules**: `firebase deploy --only firestore` (uses `firestore.rules` in this repo)

The Firestore rules require authentication: only signed-in users can read/write submissions and user metadata. This keeps the site secure and helps avoid being flagged by browsers. 

