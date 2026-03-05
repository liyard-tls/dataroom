import { Folder, FolderCreateInput, FolderUpdateInput } from '@/types/folder.types'
import { FileRecord, FileCreateInput, FileMetadata, FileUpdateInput } from '@/types/file.types'
import { SearchQuery, SearchResult } from '@/types/search.types'

/**
 * StorageAdapter — the contract every storage backend must implement.
 *
 * Current implementation: IndexedDBAdapter
 * Future implementations: SupabaseAdapter, NeonAdapter
 *
 * To add a new adapter:
 * 1. Create a class in modules/storage/adapters/ that implements this interface
 * 2. Register it in modules/storage/index.ts
 * 3. Set NEXT_PUBLIC_STORAGE_ADAPTER in .env
 */
export interface StorageAdapter {
  // ---------------------------------------------------------------------------
  // Folders
  // ---------------------------------------------------------------------------

  /** Returns all folders for a user as a flat list (tree built in-memory) */
  getFolderTree(ownerId: string): Promise<Folder[]>

  getFolderById(id: string): Promise<Folder | null>

  createFolder(input: FolderCreateInput): Promise<Folder>

  updateFolder(id: string, data: FolderUpdateInput): Promise<Folder>

  /** Deletes a folder and all nested folders and files (cascade) */
  deleteFolder(id: string): Promise<void>

  moveFolder(id: string, newParentId: string | null): Promise<void>

  // ---------------------------------------------------------------------------
  // Files
  // ---------------------------------------------------------------------------

  /** Returns file metadata (without blob) for all files in a folder */
  getFilesByFolder(folderId: string | null): Promise<FileMetadata[]>

  /** Returns the full file record including blob */
  getFileById(id: string): Promise<FileRecord | null>

  createFile(input: FileCreateInput): Promise<FileRecord>

  updateFile(id: string, data: FileUpdateInput): Promise<FileRecord>

  deleteFile(id: string): Promise<void>

  moveFile(id: string, newFolderId: string): Promise<void>

  // ---------------------------------------------------------------------------
  // Search
  // ---------------------------------------------------------------------------

  /** Full-text search over file and folder names for a given user */
  search(query: SearchQuery): Promise<SearchResult[]>
}
