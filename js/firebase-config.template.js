/**
 * Firebase configuration for shared submissions storage.
 * The apiKey is injected at deploy time from the FIREBASEAPI GitHub secret.
 * For local dev: copy to firebase-config.js and add your apiKey.
 */
const FIREBASE_CONFIG = {
  apiKey: "__FIREBASE_API_KEY__",
  authDomain: "sharedgovernance-52992.firebaseapp.com",
  projectId: "sharedgovernance-52992",
  storageBucket: "sharedgovernance-52992.firebasestorage.app",
  messagingSenderId: "977154498966",
  appId: "1:977154498966:web:7a8076e46ab19b02447db7",
  measurementId: "G-34MS20FGJD"
};
