/**
 * VT Shared Governance Tracker - Shared Utilities
 * Handles data loading, localStorage persistence, and common helpers.
 * 
 * Note: GitHub Pages serves static files. Submissions and admin edits
 * are stored in localStorage. Use Export to save submissions for backup.
 */

const GOV_STORAGE_KEYS = {
  SESSION: 'vt_gov_session',
  SUBMISSIONS: 'vt_gov_submissions',
  MEETINGS_OVERRIDE: 'vt_gov_meetings_override',
  ASSIGNMENTS_OVERRIDE: 'vt_gov_assignments_override'
};

/**
 * Fetches JSON data from the /data folder.
 * Uses relative path for GitHub Pages compatibility.
 * @param {string} filename - Name of JSON file (e.g., 'users.json')
 * @returns {Promise<Object|Array>} Parsed JSON data
 */
async function fetchData(filename) {
  // Use path relative to current page for GitHub Pages compatibility
  const pathParts = window.location.pathname.split('/').filter(Boolean);
  const last = pathParts[pathParts.length - 1];
  if (last && last.includes('.')) pathParts.pop(); // Remove current file
  const basePath = pathParts.length ? '/' + pathParts.join('/') : '';
  const response = await fetch(`${basePath}/data/${filename}`);
  if (!response.ok) throw new Error(`Failed to load ${filename}`);
  return response.json();
}

/**
 * Gets all submissions from localStorage.
 * Merges with initial submissions.json if it has data (for import scenarios).
 * @returns {Array} Array of submission objects
 */
function getSubmissions() {
  try {
    const stored = localStorage.getItem(GOV_STORAGE_KEYS.SUBMISSIONS);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

/**
 * Saves a new submission to localStorage.
 * @param {Object} submission - Submission object
 */
function saveSubmission(submission) {
  const submissions = getSubmissions();
  submissions.push(submission);
  localStorage.setItem(GOV_STORAGE_KEYS.SUBMISSIONS, JSON.stringify(submissions));
}

/**
 * Gets meetings - uses localStorage override if admin has edited, else fetches from JSON.
 * @param {Array} meetingsFromFile - Meetings loaded from meetings.json
 * @returns {Array} Merged/override meetings
 */
function getMeetingsWithOverride(meetingsFromFile) {
  try {
    const override = localStorage.getItem(GOV_STORAGE_KEYS.MEETINGS_OVERRIDE);
    if (override) return JSON.parse(override);
  } catch {}
  return meetingsFromFile;
}

/**
 * Saves meetings override to localStorage (admin edits).
 * @param {Array} meetings - Updated meetings array
 */
function saveMeetingsOverride(meetings) {
  localStorage.setItem(GOV_STORAGE_KEYS.MEETINGS_OVERRIDE, JSON.stringify(meetings));
}

/**
 * Gets assignments - uses localStorage override if admin has edited.
 * @param {Array} assignmentsFromFile - Assignments from assignments.json
 * @returns {Array} Merged/override assignments
 */
function getAssignmentsWithOverride(assignmentsFromFile) {
  try {
    const override = localStorage.getItem(GOV_STORAGE_KEYS.ASSIGNMENTS_OVERRIDE);
    if (override) return JSON.parse(override);
  } catch {}
  return assignmentsFromFile;
}

/**
 * Saves assignments override to localStorage (admin edits).
 * @param {Array} assignments - Updated assignments array
 */
function saveAssignmentsOverride(assignments) {
  localStorage.setItem(GOV_STORAGE_KEYS.ASSIGNMENTS_OVERRIDE, JSON.stringify(assignments));
}

/**
 * Generates a unique ID for new meetings.
 * @param {Array} meetings - Existing meetings
 * @returns {string} New unique ID
 */
function generateMeetingId(meetings) {
  const ids = meetings.map(m => parseInt((m.id || '').replace(/\D/g, ''), 10)).filter(Boolean);
  const max = ids.length ? Math.max(...ids) : 0;
  return `m${max + 1}`;
}
