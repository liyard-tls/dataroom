/**
 * Sharing types — architecture is pre-defined for future implementation.
 *
 * How to implement sharing:
 * 1. Add `createShare`, `getShare`, `deleteShare` methods to StorageAdapter
 * 2. In IndexedDBAdapter: store SharePermission records in an "shares" object store
 * 3. In SupabaseAdapter: use a `shares` table with RLS policies
 * 4. Generate `publicLink` as a UUID token stored with the record
 * 5. Add a public route /share/[token] that reads share by token, checks role, renders viewer
 */

export type ShareRole = 'owner' | 'editor' | 'viewer'

export interface SharePermission {
  id: string
  resourceId: string // fileId or folderId
  resourceType: 'file' | 'folder'
  role: ShareRole
  publicLink: string // UUID token used in the public URL
  expiresAt: Date | null
  createdAt: Date
}

export type ShareCreateInput = Omit<SharePermission, 'id' | 'createdAt'>
