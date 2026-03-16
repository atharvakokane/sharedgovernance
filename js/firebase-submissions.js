/**
 * Firestore-backed submissions storage.
 * When Firebase is configured, submissions are shared across all devices.
 * Otherwise falls back to localStorage.
 */
(function() {
  const SUBMISSIONS_KEY = 'vt_gov_submissions';
  let db = null;

  function initFirebase() {
    if (db) return db;
    if (typeof firebase === 'undefined' || typeof FIREBASE_CONFIG === 'undefined' || !FIREBASE_CONFIG || !FIREBASE_CONFIG.apiKey) return null;
    try {
      if (firebase.apps && firebase.apps.length > 0) {
        db = firebase.firestore();
      } else {
        firebase.initializeApp(FIREBASE_CONFIG);
        db = firebase.firestore();
      }
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
        const snap = await firestore.collection('submissions').get();
        const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        docs.sort((a, b) => {
          const dA = a.meetingDate || '';
          const dB = b.meetingDate || '';
          if (dA !== dB) return dB.localeCompare(dA);
          return (b.timestamp || '').localeCompare(a.timestamp || '');
        });
        return docs;
      } catch (e) {
        console.error('Firestore getSubmissions failed:', e);
        return [];
      }
    }
    try {
      const stored = localStorage.getItem(SUBMISSIONS_KEY);
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
          pid: String(submission.pid || ''),
          committeeName: String(submission.committeeName || ''),
          meetingDate: String(submission.meetingDate || ''),
          meetingId: String(submission.meetingId || ''),
          timestamp: String(submission.timestamp || ''),
          attendanceConfirmed: !!submission.attendanceConfirmed,
          notes: String(submission.notes || '')
        });
        return;
      } catch (e) {
        console.error('Firestore saveSubmission failed:', e);
        throw e;
      }
    }
    try {
      const stored = localStorage.getItem(SUBMISSIONS_KEY) || '[]';
      const submissions = JSON.parse(stored);
      submissions.push(submission);
      localStorage.setItem(SUBMISSIONS_KEY, JSON.stringify(submissions));
    } catch (e) {
      console.error('localStorage save failed:', e);
      throw e;
    }
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
