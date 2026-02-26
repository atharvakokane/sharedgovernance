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
│   ├── utils.js        # Data loading, localStorage helpers
│   ├── auth.js         # Authentication, session management
│   ├── dashboard.js    # Senator dashboard logic
│   └── admin.js        # Admin dashboard logic
└── data/
    ├── users.json      # PID, password, role (senator/admin)
    ├── assignments.json # Senator-to-committee assignments
    ├── meetings.json   # Meeting data (mirrors governance.vt.edu/UpcomingEvents)
    ├── committees.json # Allowed committees list (17 bodies)
    └── submissions.json # Seed file (submissions stored in localStorage)
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

## Data Persistence Note

GitHub Pages serves static files only. Submissions and admin edits (assignments, meetings) are stored in the browser's localStorage. Use the **Export Submissions** button to download a JSON backup. Data is per-browser; for shared persistence across users, a backend would be required.
