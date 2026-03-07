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

const BASE_URL = (process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://localhost:5001').replace(/\/$/, '')

let _ownerId = ''
export function setGDriveOwnerId(uid: string) { _ownerId = uid }

function headers(): HeadersInit {
  return { 'Content-Type': 'application/json', 'X-Owner-ID': _ownerId }
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: { ...headers(), ...(init?.headers ?? {}) },
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

export interface GDriveListResult {
  files: GDriveFile[]
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

  async listFiles(pageToken?: string): Promise<GDriveListResult> {
    const params = new URLSearchParams({ pageSize: '50' })
    if (pageToken) params.set('pageToken', pageToken)
    return apiFetch(`/gdrive/files?${params}`)
  },

  async importFiles(fileIds: string[], folderId: string | null): Promise<GDriveImportResult> {
    return apiFetch('/gdrive/import', {
      method: 'POST',
      body: JSON.stringify({ fileIds, folderId }),
    })
  },
}
