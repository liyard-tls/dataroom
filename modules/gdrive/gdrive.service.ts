'use client'

/**
 * Google Drive integration service.
 * Communicates with Flask backend endpoints:
 *   GET  /oauth/google-drive/status    — check if Drive is connected
 *   GET  /oauth/google-drive/authorize — get OAuth consent URL
 *   DELETE /oauth/google-drive/revoke  — disconnect Drive
 *   GET  /gdrive/files                 — list Drive files
 *   POST /gdrive/import                — import selected files
 */

import { getIdToken } from '@/config/firebase.config'

const BASE_URL = (process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://localhost:5001').replace(/\/$/, '')

let _ownerId = ''
export function setGDriveOwnerId(uid: string) { _ownerId = uid }

async function authHeaders(): Promise<HeadersInit> {
  const token = await getIdToken()
  if (!token) throw new Error('Not authenticated.')
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: { ...(await authHeaders()), ...(init?.headers ?? {}) },
    credentials: 'include',
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error ?? `API error ${res.status}`)
  }
  return res.json()
}

export interface GDriveStatus {
  connected: boolean
  email?: string
  expires_at?: string
}

export interface GDriveFile {
  id: string
  name: string
  mimeType: string
  size?: number
  modifiedTime?: string
  iconLink?: string
}

export interface GDriveFolder {
  id: string
  name: string
  iconLink?: string
}

export interface GDriveListResult {
  files: GDriveFile[]
  folders: GDriveFolder[]
  nextPageToken?: string
}

export interface GDriveImportResult {
  imported: unknown[]
  errors: { fileId: string; error: string }[]
}

export const gdriveService = {
  async getStatus(): Promise<GDriveStatus> {
    return apiFetch('/oauth/google-drive/status')
  },

  async getAuthUrl(): Promise<{ authUrl: string }> {
    return apiFetch('/oauth/google-drive/authorize')
  },

  async revoke(): Promise<void> {
    await apiFetch('/oauth/google-drive/revoke', { method: 'DELETE' })
  },

  async listItems(
    driveFolderId: string | null,
    typeFilter: string,
    nameQuery?: string,
    pageToken?: string,
  ): Promise<GDriveListResult> {
    const params = new URLSearchParams({ pageSize: '50' })
    if (pageToken) params.set('pageToken', pageToken)
    const isGlobalSearch = !!(typeFilter || nameQuery)
    if (driveFolderId && !isGlobalSearch) params.set('folderId', driveFolderId)
    if (typeFilter) params.set('typeFilter', typeFilter)
    if (nameQuery) params.set('nameQuery', nameQuery)
    return apiFetch(`/gdrive/files?${params}`)
  },

  async importFiles(fileIds: string[], folderId: string | null): Promise<GDriveImportResult> {
    return apiFetch('/gdrive/import', {
      method: 'POST',
      body: JSON.stringify({ fileIds, folderId }),
    })
  },
}
