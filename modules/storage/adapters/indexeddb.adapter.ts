import { openDB, IDBPDatabase } from 'idb'
import { StorageAdapter } from '../interface/storage.interface'
import { Folder, FolderCreateInput, FolderUpdateInput } from '@/types/folder.types'
import { FileRecord, FileCreateInput, FileMetadata, FileUpdateInput } from '@/types/file.types'
import { SearchQuery, SearchResult } from '@/types/search.types'
import { generateId } from '@/lib/fileHelpers'
import { storageConfig } from '@/config/storage.config'

/** IndexedDB schema — bump version + add migration in upgrade() for schema changes */
const DB_NAME = storageConfig.indexeddb.databaseName
const DB_VERSION = storageConfig.indexeddb.version

type DataRoomDB = {
  folders: Folder
  files: FileRecord
}

async function getDB(): Promise<IDBPDatabase<DataRoomDB>> {
  return openDB<DataRoomDB>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      // Folders store — indexed by ownerId and parentId for efficient tree queries
      if (!db.objectStoreNames.contains('folders')) {
        const folderStore = db.createObjectStore('folders', { keyPath: 'id' })
        folderStore.createIndex('by-owner', 'ownerId')
        folderStore.createIndex('by-parent', 'parentId')
      }

      // Files store — indexed by ownerId and folderId
      if (!db.objectStoreNames.contains('files')) {
        const fileStore = db.createObjectStore('files', { keyPath: 'id' })
        fileStore.createIndex('by-owner', 'ownerId')
        fileStore.createIndex('by-folder', 'folderId')
      }
    },
  })
}

export class IndexedDBAdapter implements StorageAdapter {
  // ---------------------------------------------------------------------------
  // Folders
  // ---------------------------------------------------------------------------

  async getFolderTree(ownerId: string): Promise<Folder[]> {
    const db = await getDB()
    return db.getAllFromIndex('folders', 'by-owner', ownerId)
  }

  async getFolderById(id: string): Promise<Folder | null> {
    const db = await getDB()
    return (await db.get('folders', id)) ?? null
  }

  async createFolder(input: FolderCreateInput): Promise<Folder> {
    const db = await getDB()
    const folder: Folder = {
      ...input,
      id: generateId(),
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    await db.add('folders', folder)
    return folder
  }

  async updateFolder(id: string, data: FolderUpdateInput): Promise<Folder> {
    const db = await getDB()
    const existing = await db.get('folders', id)
    if (!existing) throw new Error(`Folder not found: ${id}`)

    const updated: Folder = { ...existing, ...data, updatedAt: new Date() }
    await db.put('folders', updated)
    return updated
  }

  async deleteFolder(id: string): Promise<void> {
    const db = await getDB()
    // Collect all descendant folder IDs recursively before deleting
    const allFolderIds = await this._collectDescendantFolderIds(db, id)
    allFolderIds.push(id)

    const tx = db.transaction(['folders', 'files'], 'readwrite')

    // Delete all files in affected folders
    for (const folderId of allFolderIds) {
      const files = await tx.objectStore('files').index('by-folder').getAllKeys(folderId)
      for (const fileId of files) {
        await tx.objectStore('files').delete(fileId)
      }
    }

    // Delete all folders
    for (const folderId of allFolderIds) {
      await tx.objectStore('folders').delete(folderId)
    }

    await tx.done
  }

  async moveFolder(id: string, newParentId: string | null): Promise<void> {
    const db = await getDB()
    const folder = await db.get('folders', id)
    if (!folder) throw new Error(`Folder not found: ${id}`)

    if (newParentId === id) {
      throw new Error('Cannot move a folder into itself')
    }

    // Prevent moving a folder into its own descendant
    if (newParentId !== null) {
      const descendants = await this._collectDescendantFolderIds(db, id)
      if (descendants.includes(newParentId)) {
        throw new Error('Cannot move a folder into its own descendant')
      }
    }

    await db.put('folders', { ...folder, parentId: newParentId, updatedAt: new Date() })
  }

  // ---------------------------------------------------------------------------
  // Files
  // ---------------------------------------------------------------------------

  async getFilesByFolder(folderId: string | null): Promise<FileMetadata[]> {
    const db = await getDB()
    // IDBIndex cannot query null keys — fall back to full scan and filter
    if (folderId === null) {
      const all = await db.getAll('files')
      return all
        .filter((f) => f.folderId === null)
        .map(({ blob: _blob, ...metadata }) => metadata)
    }
    const files = await db.getAllFromIndex('files', 'by-folder', folderId)
    return files.map(({ blob: _blob, ...metadata }) => metadata)
  }

  async getFilesByOwner(ownerId: string): Promise<FileMetadata[]> {
    const db = await getDB()
    const files = await db.getAllFromIndex('files', 'by-owner', ownerId)
    return files.map(({ blob: _blob, ...metadata }) => metadata)
  }

  async getFileById(id: string): Promise<FileRecord | null> {
    const db = await getDB()
    return (await db.get('files', id)) ?? null
  }

  async createFile(input: FileCreateInput): Promise<FileRecord> {
    const db = await getDB()
    const file: FileRecord = {
      ...input,
      id: generateId(),
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    await db.add('files', file)
    return file
  }

  async updateFile(id: string, data: FileUpdateInput): Promise<FileRecord> {
    const db = await getDB()
    const existing = await db.get('files', id)
    if (!existing) throw new Error(`File not found: ${id}`)

    const updated: FileRecord = { ...existing, ...data, updatedAt: new Date() }
    await db.put('files', updated)
    return updated
  }

  async deleteFile(id: string): Promise<void> {
    const db = await getDB()
    await db.delete('files', id)
  }

  async moveFile(id: string, newFolderId: string): Promise<void> {
    const db = await getDB()
    const file = await db.get('files', id)
    if (!file) throw new Error(`File not found: ${id}`)

    await db.put('files', { ...file, folderId: newFolderId, updatedAt: new Date() })
  }

  // ---------------------------------------------------------------------------
  // Search
  // ---------------------------------------------------------------------------

  async search({ query, ownerId, fileTypeFilter }: SearchQuery): Promise<SearchResult[]> {
    const db = await getDB()
    const lowerQuery = query.toLowerCase()

    const [folders, files] = await Promise.all([
      db.getAllFromIndex('folders', 'by-owner', ownerId),
      db.getAllFromIndex('files', 'by-owner', ownerId),
    ])

    const folderResults: SearchResult[] = folders
      .filter((f) => f.name.toLowerCase().includes(lowerQuery))
      .map((f) => ({ id: f.id, name: f.name, type: 'folder', folderId: f.parentId }))

    const fileResults: SearchResult[] = files
      .filter((f) => {
        const matchesQuery = f.name.toLowerCase().includes(lowerQuery)
        const matchesType = fileTypeFilter ? f.type === fileTypeFilter : true
        return matchesQuery && matchesType
      })
      .map((f) => ({
        id: f.id,
        name: f.name,
        type: 'file',
        folderId: f.folderId,
        fileType: f.type,
        mimeType: f.mimeType,
      }))

    return [...folderResults, ...fileResults]
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  /** Recursively collects all descendant folder IDs (not including the root id itself) */
  private async _collectDescendantFolderIds(
    db: IDBPDatabase<DataRoomDB>,
    folderId: string
  ): Promise<string[]> {
    const children = await db.getAllFromIndex('folders', 'by-parent', folderId)
    const ids: string[] = []

    for (const child of children) {
      ids.push(child.id)
      const nested = await this._collectDescendantFolderIds(db, child.id)
      ids.push(...nested)
    }

    return ids
  }
}
