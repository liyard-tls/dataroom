'use client'

import { useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Folder } from '@/types/folder.types'

/**
 * Resolves a URL path segment array (folder names) to a folder ID.
 * Returns null if path is empty (root) or not found (triggers redirect).
 */
export function resolveFolderPath(
  segments: string[],
  folders: Folder[]
): { folderId: string | null; found: boolean } {
  if (segments.length === 0) return { folderId: null, found: true }

  let parentId: string | null = null
  for (const segment of segments) {
    const decoded = decodeURIComponent(segment)
    const match = folders.find(
      (f) => f.name === decoded && f.parentId === parentId
    )
    if (!match) return { folderId: null, found: false }
    parentId = match.id
  }
  return { folderId: parentId, found: true }
}

/**
 * Builds a URL path from root to the given folderId.
 * Returns [] for root, ['Contracts', '2024'] for a nested folder.
 */
export function buildFolderPath(folderId: string | null, folders: Folder[]): string[] {
  if (!folderId) return []
  const segments: string[] = []
  let current: Folder | undefined = folders.find((f) => f.id === folderId)
  while (current) {
    segments.unshift(current.name)
    current = current.parentId
      ? folders.find((f) => f.id === current!.parentId)
      : undefined
  }
  return segments
}

/**
 * Returns a navigate function that pushes the correct URL for a given folderId.
 */
export function useFolderNavigation(folders: Folder[]) {
  const router = useRouter()

  const navigate = useCallback(
    (folderId: string | null) => {
      const segments = buildFolderPath(folderId, folders)
      const path =
        segments.length === 0
          ? '/dataroom'
          : '/dataroom/' + segments.map(encodeURIComponent).join('/')
      router.push(path)
    },
    [router, folders]
  )

  return navigate
}
