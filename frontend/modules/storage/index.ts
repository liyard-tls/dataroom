import { storageConfig } from '@/config/storage.config'
import { StorageAdapter } from './interface/storage.interface'
import { IndexedDBAdapter } from './adapters/indexeddb.adapter'
import { SupabaseAdapter } from './adapters/supabase.adapter'
import { FlaskApiAdapter } from './adapters/flask-api.adapter'

/** Returns the active storage adapter based on config/env */
function createAdapter(): StorageAdapter {
  switch (storageConfig.adapter) {
    case 'indexeddb':
      return new IndexedDBAdapter()
    case 'supabase':
      return new SupabaseAdapter()
    case 'flask':
      return new FlaskApiAdapter()
    default:
      throw new Error(`Unknown storage adapter: ${storageConfig.adapter}`)
  }
}

// Singleton — one adapter instance for the whole app lifetime
let _adapter: StorageAdapter | null = null

export function getStorageAdapter(): StorageAdapter {
  if (!_adapter) {
    _adapter = createAdapter()
  }
  return _adapter
}

export type { StorageAdapter }
