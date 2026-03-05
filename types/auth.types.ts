export interface AuthUser {
  uid: string
  email: string | null
  displayName: string | null
  photoURL: string | null
}

export type AuthProvider = 'google' | 'apple' | 'email'
