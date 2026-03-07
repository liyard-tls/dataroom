'use client'

/**
 * Sharing service — communicates with Flask /shares and /public endpoints.
 * Uses X-Owner-ID for authenticated requests; public endpoints need no auth.
 */

export interface ShareLink {
  id: string
  token: string
  resourceType: 'file' | 'folder'
  resourceId: string
  ownerId: string
  expiresAt: string | null
  createdAt: string
}

export interface ShareInfo {
  share: ShareLink
  resource: Record<string, unknown>
}

export interface PublicFolderTree {
  folders: Record<string, unknown>[]
  files: Record<string, unknown>[]
}

const BASE_URL = (process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://localhost:5001').replace(/\/$/, '')

let _ownerId = ''
export function setSharingOwnerId(uid: string) { _ownerId = uid }

function authHeaders(): HeadersInit {
  return { 'Content-Type': 'application/json', 'X-Owner-ID': _ownerId }
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: { ...authHeaders(), ...(init?.headers ?? {}) },
    credentials: 'include',
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error ?? `API error ${res.status}`)
  }
  return res.json() as Promise<T>
}

/** Public fetch — no auth headers, no credentials */
async function publicFetch<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`)
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error ?? `API error ${res.status}`)
  }
  return res.json() as Promise<T>
}

// ---------------------------------------------------------------------------
// Authenticated (owner) operations
// ---------------------------------------------------------------------------

export const sharingService = {
  /** Create a share link for a file or folder. Returns the new ShareLink. */
  async createShare(
    resourceType: 'file' | 'folder',
    resourceId: string,
    expiresAt?: string | null,
  ): Promise<ShareLink> {
    return apiFetch('/shares/', {
      method: 'POST',
      body: JSON.stringify({ resourceType, resourceId, expiresAt: expiresAt ?? null }),
    })
  },

  /** List all share links for a specific resource. */
  async getSharesForResource(
    resourceType: 'file' | 'folder',
    resourceId: string,
  ): Promise<ShareLink[]> {
    return apiFetch(`/shares/resource/${resourceType}/${resourceId}`)
  },

  /** Revoke (delete) a share link. */
  async deleteShare(shareId: string): Promise<void> {
    await apiFetch(`/shares/${shareId}`, { method: 'DELETE' })
  },

  // ---------------------------------------------------------------------------
  // Public operations (no auth — usable in /share/[token] page)
  // ---------------------------------------------------------------------------

  /** Resolve a token → share metadata + resource info. */
  async getShareInfo(token: string): Promise<ShareInfo> {
    return publicFetch(`/public/share/${token}`)
  },

  /** Get the full folder tree for a shared folder. */
  async getSharedFolderTree(token: string): Promise<PublicFolderTree> {
    return publicFetch(`/public/share/${token}/tree`)
  },

  /** Build a public URL for viewing a file inline. */
  fileViewUrl(token: string, fileId: string): string {
    return `${BASE_URL}/public/share/${token}/file/${fileId}/view`
  },

  /** Build a public URL for downloading a file. */
  fileDownloadUrl(token: string, fileId: string): string {
    return `${BASE_URL}/public/share/${token}/file/${fileId}/download`
  },

  /** Build the full shareable URL (frontend /share/[token] page). */
  sharePageUrl(token: string): string {
    const origin = typeof window !== 'undefined' ? window.location.origin : ''
    return `${origin}/share/${token}`
  },
}
