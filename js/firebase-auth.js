/**
 * Firebase Authentication for VT Shared Governance Tracker.
 * Passwords are stored securely by Firebase Auth (hashed, never exposed).
 * User metadata (pid, role) is stored in Firestore users collection.
 */
(function() {
  const AUTH_EMAIL_SUFFIX = '@vt.edu';

  function getAuth() {
    if (typeof firebase === 'undefined' || typeof FIREBASE_CONFIG === 'undefined' || !FIREBASE_CONFIG?.apiKey) return null;
    try {
      if (!firebase.apps || firebase.apps.length === 0) {
        firebase.initializeApp(FIREBASE_CONFIG);
      }
      return firebase.auth();
    } catch (e) {
      console.warn('Firebase Auth init failed:', e);
      return null;
    }
  }

  function getFirestore() {
    if (typeof firebase === 'undefined') return null;
    try {
      return firebase.firestore();
    } catch (e) {
      return null;
    }
  }

  /**
   * Converts PID to the internal auth email format.
   * Accepts "atharvashashankk" or "atharvashashankk@vt.edu".
   */
  function pidToEmail(pid) {
    const p = String(pid).trim().toLowerCase();
    return p.includes('@') ? p : p + AUTH_EMAIL_SUFFIX;
  }

  /**
   * Extracts PID (username part) from auth email for assignments lookup.
   */
  function emailToPid(email) {
    if (!email || !email.includes('@')) return null;
    return email.split('@')[0];
  }

  /**
   * Signs in with PID and password using Firebase Auth.
   * @param {string} pid - User PID
   * @param {string} password - User password
   * @returns {Promise<{pid: string, role: string}>} User session data
   */
  window.firebaseAuthSignIn = async function(pid, password) {
    const auth = getAuth();
    if (!auth) throw new Error('Firebase is not configured. Please contact the administrator.');

    const email = pidToEmail(pid);
    const cred = await auth.signInWithEmailAndPassword(email, password);
    const uid = cred.user?.uid;
    if (!uid) throw new Error('Sign-in failed.');

    const db = getFirestore();
    if (!db) return { pid: String(pid).trim(), role: 'senator' };

    const shortPid = emailToPid(email) || String(pid).trim().toLowerCase();
    const userDoc = await db.collection('users').doc(shortPid).get();
    const role = userDoc.exists && userDoc.data()?.role ? userDoc.data().role : 'senator';
    return { pid: shortPid, role };
  };

  /**
   * Signs out from Firebase Auth.
   */
  window.firebaseAuthSignOut = async function() {
    const auth = getAuth();
    if (auth) {
      try {
        await auth.signOut();
      } catch (e) {
        console.warn('Firebase signOut:', e);
      }
    }
  };

  /**
   * Waits for auth state and returns current user session if signed in.
   * Delays resolving null to avoid redirect loop (Firebase may fire null before persistence restores).
   * @returns {Promise<{pid: string, role: string}|null>}
   */
  window.firebaseAuthGetSession = async function() {
    const auth = getAuth();
    if (!auth) return null;

    return new Promise(function(resolve) {
      var resolved = false;
      var nullTimeout = null;

      function finish(result) {
        if (resolved) return;
        resolved = true;
        if (nullTimeout) clearTimeout(nullTimeout);
        unsub();
        resolve(result);
      }

      const unsub = auth.onAuthStateChanged(async function(user) {
        if (user && user.email) {
          nullTimeout && clearTimeout(nullTimeout);
          const pid = emailToPid(user.email);
          if (!pid) {
            finish(null);
            return;
          }
          const db = getFirestore();
          if (!db) {
            finish({ pid, role: 'senator' });
            return;
          }
          try {
            const userDoc = await db.collection('users').doc(pid).get();
            const role = userDoc.exists && userDoc.data()?.role ? userDoc.data().role : 'senator';
            finish({ pid, role });
          } catch (e) {
            console.warn('Firestore user fetch:', e);
            finish({ pid, role: 'senator' });
          }
          return;
        }
        if (!nullTimeout) {
          nullTimeout = setTimeout(function() {
            finish(null);
          }, 1500);
        }
      });
    });
  };

  /**
   * Whether Firebase Auth is available (Firebase configured).
   */
  window.isFirebaseAuthEnabled = function() {
    return !!(typeof FIREBASE_CONFIG === 'object' && FIREBASE_CONFIG && FIREBASE_CONFIG.apiKey);
  };
})();
