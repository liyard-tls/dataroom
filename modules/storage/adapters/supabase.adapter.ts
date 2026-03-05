import { StorageAdapter } from '../interface/storage.interface'
import { Folder, FolderCreateInput, FolderUpdateInput } from '@/types/folder.types'
import { FileRecord, FileCreateInput, FileMetadata, FileUpdateInput } from '@/types/file.types'
import { SearchQuery, SearchResult } from '@/types/search.types'

/**
 * SupabaseAdapter — stub for future migration from IndexedDB to Supabase + Neon.
 *
 * Migration checklist:
 * 1. Install: npm install @supabase/supabase-js
 * 2. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to .env
 * 3. Create tables in Supabase (SQL):
 *    - folders (id, name, parent_id, owner_id, created_at, updated_at)
 *    - files   (id, name, type, mime_type, size, folder_id, owner_id, created_at, updated_at)
 *    - For blobs: use Supabase Storage bucket instead of storing in DB
 * 4. Enable Row Level Security (RLS) on both tables
 * 5. Implement each method below using supabase-js client
 * 6. For cascade delete: use PostgreSQL FK with ON DELETE CASCADE
 * 7. For search: use Postgres full-text search or pg_trgm extension
 * 8. Set NEXT_PUBLIC_STORAGE_ADAPTER=supabase in .env
 */
export class SupabaseAdapter implements StorageAdapter {
  async getFolderTree(_ownerId: string): Promise<Folder[]> {
    throw new Error('SupabaseAdapter not implemented. See migration checklist above.')
  }

  async getFolderById(_id: string): Promise<Folder | null> {
    throw new Error('SupabaseAdapter not implemented.')
  }

  async createFolder(_input: FolderCreateInput): Promise<Folder> {
    throw new Error('SupabaseAdapter not implemented.')
  }

  async updateFolder(_id: string, _data: FolderUpdateInput): Promise<Folder> {
    throw new Error('SupabaseAdapter not implemented.')
  }

  async deleteFolder(_id: string): Promise<void> {
    throw new Error('SupabaseAdapter not implemented.')
  }

  async moveFolder(_id: string, _newParentId: string | null): Promise<void> {
    throw new Error('SupabaseAdapter not implemented.')
  }

  async getFilesByFolder(_folderId: string): Promise<FileMetadata[]> {
    throw new Error('SupabaseAdapter not implemented.')
  }

  async getFilesByOwner(_ownerId: string): Promise<FileMetadata[]> {
    throw new Error('SupabaseAdapter not implemented.')
  }

  async getFileById(_id: string): Promise<FileRecord | null> {
    throw new Error('SupabaseAdapter not implemented.')
  }

  async createFile(_input: FileCreateInput): Promise<FileRecord> {
    throw new Error('SupabaseAdapter not implemented.')
  }

  async updateFile(_id: string, _data: FileUpdateInput): Promise<FileRecord> {
    throw new Error('SupabaseAdapter not implemented.')
  }

  async deleteFile(_id: string): Promise<void> {
    throw new Error('SupabaseAdapter not implemented.')
  }

  async moveFile(_id: string, _newFolderId: string): Promise<void> {
    throw new Error('SupabaseAdapter not implemented.')
  }

  async search(_query: SearchQuery): Promise<SearchResult[]> {
    throw new Error('SupabaseAdapter not implemented.')
  }
}
