/**
 * VT Shared Governance Tracker - Authentication Module
 * Handles login validation, session management, and role-based redirects.
 */

/**
 * Validates user credentials against users.json data.
 * @param {string} pid - User's PID
 * @param {string} password - User's password
 * @param {Array} users - Array of user objects from users.json
 * @returns {Object|null} User object if valid, null otherwise
 */
function validateUser(pid, password, users) {
  const user = users.find(u => 
    String(u.pid).trim() === String(pid).trim() && 
    u.password === password
  );
  return user || null;
}

/**
 * Creates a session and stores it in localStorage.
 * @param {Object} user - Validated user object
 */
function createSession(user) {
  const session = {
    pid: user.pid,
    role: user.role,
    timestamp: Date.now()
  };
  localStorage.setItem(GOV_STORAGE_KEYS.SESSION, JSON.stringify(session));
}

/**
 * Gets the current session from localStorage.
 * @returns {Object|null} Session object or null if not logged in
 */
function getSession() {
  try {
    const stored = localStorage.getItem(GOV_STORAGE_KEYS.SESSION);
    if (!stored) return null;
    const session = JSON.parse(stored);
    return session;
  } catch {
    return null;
  }
}

/**
 * Clears the session (logout).
 */
function clearSession() {
  localStorage.removeItem(GOV_STORAGE_KEYS.SESSION);
}

/**
 * Checks if user has a valid session and redirects to login if not.
 * Call this on protected pages (dashboard, admin).
 * @param {string} requiredRole - 'senator' or 'admin'. If null, any role is OK.
 * @returns {Object|null} Session if valid, null if redirected
 */
function requireAuth(requiredRole = null) {
  const session = getSession();
  if (!session) {
    redirectToLogin();
    return null;
  }
  if (requiredRole && session.role !== requiredRole) {
    if (session.role === 'admin') {
      window.location.href = getBasePath() + '/admin.html';
    } else {
      window.location.href = getBasePath() + '/dashboard.html';
    }
    return null;
  }
  return session;
}

/**
 * Redirects to login page. Preserves base path for GitHub Pages.
 */
function redirectToLogin() {
  window.location.href = getBasePath() + '/index.html';
}

/**
 * Gets base path for GitHub Pages (e.g., /sharedgovernance or '').
 * @returns {string}
 */
function getBasePath() {
  const pathParts = window.location.pathname.split('/').filter(Boolean);
  // Remove current file only if it looks like one (has extension)
  const last = pathParts[pathParts.length - 1];
  if (last && last.includes('.')) pathParts.pop();
  return pathParts.length ? '/' + pathParts.join('/') : '';
}
