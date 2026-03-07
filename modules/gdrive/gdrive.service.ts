'use client'

/**
 * Google Drive integration service.
 * Uses Google Picker API for file selection — no server-side OAuth storage needed.
 * The Picker returns a short-lived access_token which is forwarded to the backend
 * to download the selected files.
 *
 * Backend endpoint:
 *   POST /gdrive/import  { accessToken, fileIds, folderId }
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

export interface GDriveImportResult {
  imported: unknown[]
  errors: { fileId: string; error: string }[]
}

export const gdriveService = {
  async importFiles(
    accessToken: string,
    fileIds: string[],
    folderId: string | null,
  ): Promise<GDriveImportResult> {
    return apiFetch('/gdrive/import', {
      method: 'POST',
      body: JSON.stringify({ accessToken, fileIds, folderId }),
    })
  },
}
