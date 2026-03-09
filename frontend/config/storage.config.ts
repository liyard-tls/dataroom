/**
 * Storage adapter selector.
 * To switch to a different backend, change NEXT_PUBLIC_STORAGE_ADAPTER in .env
 * and implement the corresponding adapter in modules/storage/adapters/.
 *
 * Supported values: 'indexeddb' | 'supabase' | 'flask'
 */

export type StorageAdapterType = 'indexeddb' | 'supabase' | 'flask'

export const storageConfig = {
  adapter: (process.env.NEXT_PUBLIC_STORAGE_ADAPTER ?? 'indexeddb') as StorageAdapterType,

  indexeddb: {
    databaseName: 'data-room-db',
    version: 1,
  },
} as const
