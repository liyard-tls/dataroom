import { getStorageAdapter } from '@/modules/storage'
import { Folder, FolderCreateInput } from '@/types/folder.types'

/** Builds a tree path (breadcrumb) from root to the given folder */
export function buildBreadcrumb(folders: Folder[], folderId: string | null): Folder[] {
  if (!folderId) return []

  const folderMap = new Map(folders.map((f) => [f.id, f]))
  const path: Folder[] = []
  let current = folderMap.get(folderId)

  while (current) {
    path.unshift(current)
    current = current.parentId ? folderMap.get(current.parentId) : undefined
  }

  return path
}

/** Returns direct children of a folder (or root children if parentId is null) */
export function getChildFolders(folders: Folder[], parentId: string | null): Folder[] {
  return folders.filter((f) => f.parentId === parentId)
}

export const folderService = {
  async loadFolderTree(ownerId: string): Promise<Folder[]> {
    return getStorageAdapter().getFolderTree(ownerId)
  },

  async createFolder(input: FolderCreateInput): Promise<Folder> {
    return getStorageAdapter().createFolder(input)
  },

  async renameFolder(id: string, name: string): Promise<Folder> {
    return getStorageAdapter().updateFolder(id, { name })
  },

  async deleteFolder(id: string): Promise<void> {
    return getStorageAdapter().deleteFolder(id)
  },

  async moveFolder(id: string, newParentId: string | null): Promise<void> {
    return getStorageAdapter().moveFolder(id, newParentId)
  },
}
