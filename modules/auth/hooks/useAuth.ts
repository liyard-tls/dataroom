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
      // Set the owner ID BEFORE updating React state so that any useEffect
      // triggered by setUser/setLoading will already see _ownerId populated.
      if (storageConfig.adapter === 'flask') {
        const { setOwnerId } = await import('@/modules/storage/adapters/flask-api.adapter')
        setOwnerId(user?.uid ?? '')
      }
      const { setGDriveOwnerId } = await import('@/modules/gdrive/gdrive.service')
      setGDriveOwnerId(user?.uid ?? '')
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
