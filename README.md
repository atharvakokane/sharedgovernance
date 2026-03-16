# VT Shared Governance Tracker

A static web application for Virginia Tech Shared Governance appointees to log meeting attendance and notes. Built for deployment on GitHub Pages using only HTML, CSS, and vanilla JavaScript.

## Features

- **Authentication**: PID and password validation against `users.json`
- **Senator Dashboard**: View assigned committees and meetings; confirm attendance and submit notes
- **Admin Dashboard**: View all submissions, manage committee assignments, edit meetings, export data
- **Mobile-First**: Responsive design with hamburger menu on small screens

## File Structure

```
/
├── index.html          # Login page
├── dashboard.html      # Senator dashboard
├── admin.html          # Admin (cabinet) dashboard
├── css/
│   └── styles.css      # Shared styles
├── js/
│   ├── firebase-config.js    # Firebase config (optional, for shared submissions)
│   ├── firebase-submissions.js # Firestore submissions (when Firebase configured)
│   ├── utils.js        # Data loading, localStorage helpers
│   ├── auth.js         # Authentication, session management
│   ├── dashboard.js    # Senator dashboard logic
│   └── admin.js        # Admin dashboard logic
├── data/
│   ├── users.json      # PID, password, role (senator/admin)
│   ├── assignments.json # Senator-to-committee assignments
│   ├── meetings.json   # Meeting data (mirrors governance.vt.edu/UpcomingEvents)
│   └── committees.json # Allowed committees list (17 bodies)
├── security.txt        # Security contact (RFC 9116)
└── .well-known/
    └── security.txt   # Security contact (canonical)
```

## Data Files

### users.json
```json
[
  { "pid": "admin001", "password": "admin123", "role": "admin" },
  { "pid": "12345678", "password": "senator1", "role": "senator" }
]
```

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
3. Set **Source** to "Deploy from a branch"
4. Select your branch and `/ (root)` folder
5. Save

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

- **Admin**: PID `admin001`, password `admin123`
- **Senator**: PID `12345678`, password `senator1`
- **Senator**: PID `87654321`, password `senator2`

**Important**: Change these before production use.

## Data Persistence

- **Submissions**: By default, stored in the browser's localStorage (per-device). To share submissions across all devices so admins can access them from any computer, configure **Firebase Firestore** (see below).
- **Assignments & meetings**: Admin edits are stored in localStorage. Use **Export** to backup.

## Shared Submissions (Firebase Firestore)

To make submissions accessible from any computer an admin uses:

1. Create a project at [Firebase Console](https://console.firebase.google.com/)
2. Enable **Firestore Database** (Create database → Start in test mode for development)
3. In Project Settings, copy your web app config
4. Edit `js/firebase-config.js` and replace `FIREBASE_CONFIG = null` with your config:

```javascript
const FIREBASE_CONFIG = {
  apiKey: "your-api-key",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc123"
};
```

5. **Set Firestore security rules** (required for cross-device sync). Firebase defaults to "deny all", so submissions will not sync until you update rules.

   - Go to [Firebase Console](https://console.firebase.google.com/) → your project → **Firestore Database** → **Rules**
   - Replace the rules with:

   ```
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /submissions/{document=**} {
         allow read, write: if true;
       }
     }
   }
   ```

   - Click **Publish**

   Or deploy via CLI: `firebase deploy --only firestore` (using the `firestore.rules` file in this repo).

**Data not syncing across devices?** Check that (1) Firestore rules allow read/write on `submissions`, and (2) the Admin page shows "(Firestore – syncs across devices)" under Submissions. If it shows "(localStorage – this device only)", the config or rules may be wrong.

**Note**: For production, add proper authentication and restrict rules. The free Firestore tier is sufficient for typical usage.
