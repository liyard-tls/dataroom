'use client'

import { useEffect } from 'react'
import { useAuthStore } from '@/store/authStore'
import { authService } from '../services/auth.service'
import { storageConfig } from '@/config/storage.config'

/** Subscribes to Firebase auth state and syncs it to the Zustand authStore */
export function useAuthListener() {
  const { setUser, setLoading } = useAuthStore()

  useEffect(() => {
    const unsubscribe = authService.onAuthStateChanged(async (user) => {
      setUser(user)
      setLoading(false)

      // When using the Flask adapter, pass the Firebase UID to the adapter
      // so it can include it in X-Owner-ID request headers.
      if (storageConfig.adapter === 'flask') {
        const { setOwnerId } = await import('@/modules/storage/adapters/flask-api.adapter')
        setOwnerId(user?.uid ?? '')
      }
    })
    return unsubscribe
  }, [setUser, setLoading])
}

/** Returns current auth state from the store */
export function useAuth() {
  const { user, isLoading } = useAuthStore()
  return { user, isLoading, isAuthenticated: !!user }
}
