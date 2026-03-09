import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app'
import { Auth, getAuth } from 'firebase/auth'

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
}

// Lazy singletons — Firebase is client-side only.
// Deferring initialization prevents errors during Next.js build when env vars are absent.
let _app: FirebaseApp | null = null
let _auth: Auth | null = null

function getFirebaseApp(): FirebaseApp {
  if (!_app) {
    _app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig)
  }
  return _app
}

export function getFirebaseAuth(): Auth {
  if (!_auth) {
    _auth = getAuth(getFirebaseApp())
  }
  return _auth
}

/**
 * Returns a fresh Firebase ID token for the currently signed-in user.
 * Waits up to 5 seconds for Firebase to restore a persisted session before
 * giving up — this prevents a race condition where currentUser is null on
 * the first render tick while Firebase is still reading from IndexedDB/localStorage.
 * Returns null if no user is signed in.
 */
export async function getIdToken(): Promise<string | null> {
  const auth = getFirebaseAuth()

  // Fast path — user already resolved (common case after first load)
  if (auth.currentUser) {
    return auth.currentUser.getIdToken()
  }

  // Wait for Firebase to restore the persisted session (max 5 s)
  return new Promise((resolve) => {
    const TIMEOUT = 5_000
    let settled = false

    const timer = setTimeout(() => {
      if (!settled) {
        settled = true
        unsubscribe()
        resolve(null)
      }
    }, TIMEOUT)

    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (!settled) {
        settled = true
        clearTimeout(timer)
        unsubscribe()
        if (user) {
          user.getIdToken().then(resolve).catch(() => resolve(null))
        } else {
          resolve(null)
        }
      }
    })
  })
}
