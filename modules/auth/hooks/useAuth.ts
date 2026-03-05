'use client'

import { useEffect } from 'react'
import { useAuthStore } from '@/store/authStore'
import { authService } from '../services/auth.service'

/** Subscribes to Firebase auth state and syncs it to the Zustand authStore */
export function useAuthListener() {
  const { setUser, setLoading } = useAuthStore()

  useEffect(() => {
    const unsubscribe = authService.onAuthStateChanged((user) => {
      setUser(user)
      setLoading(false)
    })
    return unsubscribe
  }, [setUser, setLoading])
}

/** Returns current auth state from the store */
export function useAuth() {
  const { user, isLoading } = useAuthStore()
  return { user, isLoading, isAuthenticated: !!user }
}
