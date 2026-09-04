import { initializeApp, getApps, getApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

// Fill these in with your Firebase project settings
// (Firebase Console -> Project settings -> Your apps -> SDK config)
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

export const app = getApps().length ? getApp() : initializeApp(firebaseConfig)
export const auth = getAuth(app)
export const db = getFirestore(app)

// A secondary Firebase app instance. Used ONLY when an Admin creates a new
// employee account, so that creating the new account does not sign the
// Admin out (createUserWithEmailAndPassword automatically signs in as the
// newly created user on the app instance it's called on).
const SECONDARY_NAME = 'Secondary'
export const secondaryApp = getApps().find((a) => a.name === SECONDARY_NAME)
  || initializeApp(firebaseConfig, SECONDARY_NAME)
export const secondaryAuth = getAuth(secondaryApp)
