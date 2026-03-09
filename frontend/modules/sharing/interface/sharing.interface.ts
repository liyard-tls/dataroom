import { SharePermission, ShareCreateInput } from '@/types/sharing.types'

/**
 * SharingAdapter — interface for future sharing feature implementation.
 *
 * Implementation steps:
 * 1. Add this interface to StorageAdapter (or use as a separate optional capability)
 * 2. IndexedDB: add an "shares" object store indexed by resourceId and publicLink
 * 3. Supabase: add a "shares" table with RLS — anon users can read by publicLink
 * 4. Add a public route: /share/[token]
 *    - Fetch share by token (publicLink), check expiresAt
 *    - If role is 'viewer', render read-only ViewerModal
 *    - If role is 'editor', render full UI but scoped to that resource
 * 5. Add UI: right-click → Share → generates link, shows role selector
 */
export interface SharingAdapter {
  createShare(input: ShareCreateInput): Promise<SharePermission>
  getShareByToken(token: string): Promise<SharePermission | null>
  getSharesByResource(resourceId: string): Promise<SharePermission[]>
  deleteShare(id: string): Promise<void>
}
