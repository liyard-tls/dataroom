'use client'

import { useEffect, useRef } from 'react'
import { seedNewUser } from './seed.service'

function seedKey(ownerId: string) {
  return `dataroom:seeded:${ownerId}`
}

/**
 * Calls seedNewUser once per user account — persisted in localStorage so it
 * never re-runs across page reloads or component remounts.
 * Fires only when the folder tree has been fetched and is empty.
 */
export function useFirstRun(ownerId: string | undefined, foldersLoaded: boolean, isEmpty: boolean, onDone: () => void) {
  const seeding = useRef(false)

  useEffect(() => {
    console.log('[firstRun] effect:', { ownerId, foldersLoaded, isEmpty, seeding: seeding.current })
    if (!ownerId || !foldersLoaded || !isEmpty || seeding.current) return
    if (localStorage.getItem(seedKey(ownerId))) {
      console.log('[firstRun] already seeded, skipping')
      return
    }

    seeding.current = true
    localStorage.setItem(seedKey(ownerId), '1')
    console.log('[firstRun] starting seed...')
    seedNewUser(ownerId)
      .then(() => { console.log('[firstRun] seed complete, calling onDone'); onDone() })
      .catch((err) => { console.error('[firstRun] seed failed:', err) })
  }, [ownerId, foldersLoaded, isEmpty, onDone])
}
