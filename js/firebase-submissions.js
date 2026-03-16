/**
 * Firestore-backed submissions storage.
 * When Firebase is configured, submissions are shared across all devices.
 * Otherwise falls back to localStorage.
 */
(function() {
  let db = null;

  function initFirebase() {
    if (db) return db;
    if (typeof firebase === 'undefined' || !FIREBASE_CONFIG) return null;
    try {
      firebase.initializeApp(FIREBASE_CONFIG);
      db = firebase.firestore();
      return db;
    } catch (e) {
      console.warn('Firebase init failed:', e);
      return null;
    }
  }

  window.getSubmissionsAsync = async function() {
    const firestore = initFirebase();
    if (firestore) {
      try {
        const snap = await firestore.collection('submissions').orderBy('meetingDate', 'desc').orderBy('timestamp', 'desc').get();
        return snap.docs.map(d => ({ id: d.id, ...d.data() }));
      } catch (e) {
        console.error('Firestore getSubmissions failed:', e);
        return [];
      }
    }
    try {
      const stored = localStorage.getItem(GOV_STORAGE_KEYS.SUBMISSIONS);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  };

  window.saveSubmissionAsync = async function(submission) {
    const firestore = initFirebase();
    if (firestore) {
      try {
        await firestore.collection('submissions').add({
          pid: submission.pid,
          committeeName: submission.committeeName,
          meetingDate: submission.meetingDate,
          meetingId: submission.meetingId,
          timestamp: submission.timestamp,
          attendanceConfirmed: submission.attendanceConfirmed,
          notes: submission.notes || ''
        });
        return;
      } catch (e) {
        console.error('Firestore saveSubmission failed:', e);
        throw e;
      }
    }
    const submissions = JSON.parse(localStorage.getItem(GOV_STORAGE_KEYS.SUBMISSIONS) || '[]');
    submissions.push(submission);
    localStorage.setItem(GOV_STORAGE_KEYS.SUBMISSIONS, JSON.stringify(submissions));
  };

  window.importSubmissionsToFirestore = async function(submissions) {
    const firestore = initFirebase();
    if (!firestore) return { ok: false, added: 0 };
    const batch = firestore.batch();
    const existing = await window.getSubmissionsAsync();
    const existingKeys = new Set(existing.map(s => `${s.pid}|${s.meetingId}|${s.timestamp}`));
    let added = 0;
    for (const s of submissions) {
      if (s.pid && s.committeeName && s.timestamp) {
        const key = `${s.pid}|${s.meetingId}|${s.timestamp}`;
        if (!existingKeys.has(key)) {
          const ref = firestore.collection('submissions').doc();
          batch.set(ref, {
            pid: s.pid,
            committeeName: s.committeeName,
            meetingDate: s.meetingDate || '',
            meetingId: s.meetingId || '',
            timestamp: s.timestamp,
            attendanceConfirmed: s.attendanceConfirmed || false,
            notes: s.notes || ''
          });
          existingKeys.add(key);
          added++;
        }
      }
    }
    if (added > 0) await batch.commit();
    return { ok: true, added };
  };

  window.isFirebaseEnabled = function() {
    return !!(typeof FIREBASE_CONFIG === 'object' && FIREBASE_CONFIG && FIREBASE_CONFIG.apiKey);
  };
})();
