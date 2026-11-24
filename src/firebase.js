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

// Multi-branch / Tenant support
// VITE_BRANCH_PREFIX: e.g. "cn2_" (or empty for primary branch)
export const BRANCH_PREFIX = import.meta.env.VITE_BRANCH_PREFIX || ''
export const ADMIN_EMAIL = import.meta.env.VITE_ADMIN_EMAIL || (BRANCH_PREFIX ? `admin_${BRANCH_PREFIX.replace(/[^a-zA-Z0-9]/g, '')}@lottee.internal` : 'admin@lottee.internal')
export const BRANCH_NAME = import.meta.env.VITE_BRANCH_NAME || ''

/**
 * Returns collection name prefixed with BRANCH_PREFIX (e.g., 'bills' -> 'cn2_bills')
 * If BRANCH_PREFIX is empty, returns original name ('bills').
 */
export const col = (name) => `${BRANCH_PREFIX}${name}`

// A secondary Firebase app instance. Used ONLY when an Admin creates a new
// employee account, so that creating the new account does not sign the
// Admin out (createUserWithEmailAndPassword automatically signs in as the
// newly created user on the app instance it's called on).
const SECONDARY_NAME = 'Secondary'
export const secondaryApp = getApps().find((a) => a.name === SECONDARY_NAME)
  || initializeApp(firebaseConfig, SECONDARY_NAME)
export const secondaryAuth = getAuth(secondaryApp)
