/**
 * VT Shared Governance Tracker - Authentication Module
 * Uses Firebase Auth for secure password verification. User metadata (pid, role)
 * is stored in Firestore. No plaintext passwords are stored or transmitted.
 */

/**
 * @deprecated Use firebaseAuthSignIn instead. Kept for reference only.
 */
function validateUser(pid, password, users) {
  return null;
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
 * Clears the session (logout). Also signs out from Firebase Auth when enabled.
 */
function clearSession() {
  localStorage.removeItem(GOV_STORAGE_KEYS.SESSION);
  if (typeof firebaseAuthSignOut === 'function') {
    firebaseAuthSignOut();
  }
}

/**
 * Async auth check using Firebase Auth. Call on protected pages (dashboard, admin).
 * @param {string} requiredRole - 'senator' or 'admin'. If null, any role is OK.
 * @returns {Promise<Object|null>} Session if valid, null if redirected
 */
async function requireAuthAsync(requiredRole = null) {
  if (typeof firebaseAuthGetSession === 'function' && typeof isFirebaseAuthEnabled === 'function' && isFirebaseAuthEnabled()) {
    const session = await firebaseAuthGetSession();
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
    createSession(session);
    return session;
  }
  redirectToLogin();
  return null;
}

/**
 * @deprecated Use requireAuthAsync. Sync version for backward compatibility - redirects if no session.
 * @param {string} requiredRole - 'senator' or 'admin'
 * @returns {Object|null}
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
