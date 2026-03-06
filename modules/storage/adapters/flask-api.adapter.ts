'use client'

/**
 * FlaskApiAdapter — StorageAdapter implementation backed by the Flask REST API.
 *
 * Usage: set NEXT_PUBLIC_STORAGE_ADAPTER=flask in .env.local
 *
 * Auth: Every request carries the Firebase UID in the X-Owner-ID header.
 * The owner_id is injected via setOwnerId() once the user is authenticated.
 *
 * File blobs: The backend stores files on disk and serves them via
 * GET /files/:id/view. getFileById() fetches the blob from that endpoint
 * and wraps it in a FileRecord compatible with the existing viewer code.
 */

import { StorageAdapter } from '../interface/storage.interface'
import { Folder, FolderCreateInput, FolderUpdateInput } from '@/types/folder.types'
import { FileRecord, FileCreateInput, FileMetadata, FileUpdateInput, MIME_TO_FILE_TYPE } from '@/types/file.types'
import { SearchQuery, SearchResult } from '@/types/search.types'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const BASE_URL = (process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://localhost:5001').replace(/\/$/, '')

let _ownerId = ''

/** Must be called after user signs in. Sets the owner ID sent with every request. */
export function setOwnerId(uid: string) {
  _ownerId = uid
}

/** Returns true if an owner ID has been set (i.e. user is authenticated). */
export function isOwnerIdSet(): boolean {
  return !!_ownerId
}

function headers(): HeadersInit {
  return {
    'Content-Type': 'application/json',
    'X-Owner-ID': _ownerId,
  }
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: {
      ...headers(),
      ...(init?.headers ?? {}),
    },
    credentials: 'include',
  })

  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error ?? `API error ${res.status}: ${path}`)
  }

  return res.json() as Promise<T>
}

/** Convert date strings from the API into Date objects */
function parseFolder(raw: Record<string, unknown>): Folder {
  return {
    id: raw.id as string,
    name: raw.name as string,
    parentId: (raw.parentId as string | null) ?? null,
    ownerId: raw.ownerId as string,
    createdAt: new Date(raw.createdAt as string),
    updatedAt: new Date(raw.updatedAt as string),
  }
}

function parseFileMetadata(raw: Record<string, unknown>): FileMetadata {
  const mimeType = (raw.mimeType as string) ?? ''
  return {
    id: raw.id as string,
    name: raw.name as string,
    type: MIME_TO_FILE_TYPE[mimeType] ?? 'other',
    mimeType,
    size: (raw.size as number) ?? 0,
    folderId: (raw.folderId as string | null) ?? null,
    ownerId: raw.ownerId as string,
    createdAt: new Date(raw.createdAt as string),
    updatedAt: new Date(raw.updatedAt as string),
  }
}

// ---------------------------------------------------------------------------
// Adapter
// ---------------------------------------------------------------------------

export class FlaskApiAdapter implements StorageAdapter {
  // ---------------------------------------------------------------------------
  // Folders
  // ---------------------------------------------------------------------------

  async getFolderTree(_ownerId: string): Promise<Folder[]> {
    if (!_ownerId) return []
    // ownerId is sent via X-Owner-ID header; the param is ignored server-side
    const raw = await apiFetch<Record<string, unknown>[]>('/folders/')
    return raw.map(parseFolder)
  }

  async getFolderById(id: string): Promise<Folder | null> {
    try {
      const raw = await apiFetch<Record<string, unknown>>(`/folders/${id}`)
      return parseFolder(raw)
    } catch {
      return null
    }
  }

  async createFolder(input: FolderCreateInput): Promise<Folder> {
    const raw = await apiFetch<Record<string, unknown>>('/folders/', {
      method: 'POST',
      body: JSON.stringify({ name: input.name, parentId: input.parentId }),
    })
    return parseFolder(raw)
  }

  async updateFolder(id: string, data: FolderUpdateInput): Promise<Folder> {
    const raw = await apiFetch<Record<string, unknown>>(`/folders/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ name: data.name }),
    })
    return parseFolder(raw)
  }

  async deleteFolder(id: string): Promise<void> {
    await apiFetch(`/folders/${id}`, { method: 'DELETE' })
  }

  async moveFolder(id: string, newParentId: string | null): Promise<void> {
    await apiFetch(`/folders/${id}/move`, {
      method: 'POST',
      body: JSON.stringify({ parentId: newParentId }),
    })
  }

  // ---------------------------------------------------------------------------
  // Files
  // ---------------------------------------------------------------------------

  async getFilesByFolder(folderId: string | null): Promise<FileMetadata[]> {
    if (!_ownerId) return []
    const qs = folderId != null ? `?folder_id=${folderId}` : ''
    const raw = await apiFetch<Record<string, unknown>[]>(`/files/${qs}`)
    return raw.map(parseFileMetadata)
  }

  async getFilesByOwner(_ownerId: string): Promise<FileMetadata[]> {
    if (!_ownerId) return []
    const raw = await apiFetch<Record<string, unknown>[]>('/files/?all=true')
    return raw.map(parseFileMetadata)
  }

  /**
   * Fetches file metadata + downloads the binary blob from /files/:id/view.
   * The blob is used by the viewer (PDF, image, video, text previews).
   */
  async getFileById(id: string): Promise<FileRecord | null> {
    try {
      const meta = await apiFetch<Record<string, unknown>>(`/files/${id}`)
      const metadata = parseFileMetadata(meta)

      // Fetch binary content for the viewer
      const blobRes = await fetch(`${BASE_URL}/files/${id}/view`, {
        headers: { 'X-Owner-ID': _ownerId },
        credentials: 'include',
      })
      if (!blobRes.ok) return null
      const blob = await blobRes.blob()

      return { ...metadata, blob }
    } catch {
      return null
    }
  }

  async createFile(input: FileCreateInput): Promise<FileRecord> {
    // Upload file as multipart form data
    const form = new FormData()
    form.append('file', input.blob as Blob, input.name)
    if (input.folderId) form.append('folder_id', input.folderId)

    const res = await fetch(`${BASE_URL}/files/upload`, {
      method: 'POST',
      headers: { 'X-Owner-ID': _ownerId },
      body: form,
      credentials: 'include',
    })

    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      throw new Error(body.error ?? `Upload failed: ${res.status}`)
    }

    const raw = await res.json() as Record<string, unknown>
    const metadata = parseFileMetadata(raw)
    return { ...metadata, blob: input.blob as Blob }
  }

  async updateFile(id: string, data: FileUpdateInput): Promise<FileRecord> {
    const raw = await apiFetch<Record<string, unknown>>(`/files/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ name: data.name }),
    })
    const metadata = parseFileMetadata(raw)

    // Re-fetch blob so the return value is a valid FileRecord
    const blobRes = await fetch(`${BASE_URL}/files/${id}/view`, {
      headers: { 'X-Owner-ID': _ownerId },
      credentials: 'include',
    })
    const blob = blobRes.ok ? await blobRes.blob() : new Blob()
    return { ...metadata, blob }
  }

  async deleteFile(id: string): Promise<void> {
    await apiFetch(`/files/${id}`, { method: 'DELETE' })
  }

  async moveFile(id: string, newFolderId: string | null): Promise<void> {
    await apiFetch(`/files/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ folderId: newFolderId }),
    })
  }

  // ---------------------------------------------------------------------------
  // Search
  // ---------------------------------------------------------------------------

  async search({ query, fileTypeFilter }: SearchQuery): Promise<SearchResult[]> {
    if (!_ownerId) return []
    const qs = new URLSearchParams({ q: query })
    if (fileTypeFilter) qs.set('type', fileTypeFilter)
    return apiFetch<SearchResult[]>(`/search?${qs}`)
  }
}
