import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  OAuthProvider,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User,
} from 'firebase/auth'
import { getFirebaseAuth } from '@/config/firebase.config'
import { AuthUser } from '@/types/auth.types'

/** Maps a Firebase User to our internal AuthUser type */
function toAuthUser(user: User): AuthUser {
  return {
    uid: user.uid,
    email: user.email,
    displayName: user.displayName,
    photoURL: user.photoURL,
  }
}

export const authService = {
  async signInWithEmail(email: string, password: string): Promise<AuthUser> {
    const result = await signInWithEmailAndPassword(getFirebaseAuth(), email, password)
    return toAuthUser(result.user)
  },

  async signUpWithEmail(email: string, password: string): Promise<AuthUser> {
    const result = await createUserWithEmailAndPassword(getFirebaseAuth(), email, password)
    return toAuthUser(result.user)
  },

  async signInWithGoogle(): Promise<AuthUser> {
    const provider = new GoogleAuthProvider()
    const result = await signInWithPopup(getFirebaseAuth(), provider)
    return toAuthUser(result.user)
  },

  async signInWithApple(): Promise<AuthUser> {
    const provider = new OAuthProvider('apple.com')
    provider.addScope('email')
    provider.addScope('name')
    const result = await signInWithPopup(getFirebaseAuth(), provider)
    return toAuthUser(result.user)
  },

  async signOut(): Promise<void> {
    await firebaseSignOut(getFirebaseAuth())
  },

  /** Subscribe to auth state changes — call in the root layout or provider */
  onAuthStateChanged(callback: (user: AuthUser | null) => void): () => void {
    return onAuthStateChanged(getFirebaseAuth(), (user) => {
      callback(user ? toAuthUser(user) : null)
    })
  },
}
