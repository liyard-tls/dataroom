import { zipSync, strToU8 } from 'fflate'
import { getStorageAdapter } from '@/modules/storage'
import { FileCreateInput, FileMetadata, FileRecord, FileUpdateInput } from '@/types/file.types'
import { Folder } from '@/types/folder.types'
import { getFileType, validateFileSize } from '@/lib/fileHelpers'

export const fileService = {
  async getFiles(folderId: string | null): Promise<FileMetadata[]> {
    return getStorageAdapter().getFilesByFolder(folderId)
  },

  async getFilesByOwner(ownerId: string): Promise<FileMetadata[]> {
    return getStorageAdapter().getFilesByOwner(ownerId)
  },

  async getFile(id: string): Promise<FileRecord | null> {
    return getStorageAdapter().getFileById(id)
  },

  /** Validates and uploads a browser File object into the data room */
  async uploadFile(file: File, folderId: string | null, ownerId: string): Promise<FileRecord> {
    const sizeCheck = validateFileSize(file.size)
    if (!sizeCheck.valid) {
      throw new Error(sizeCheck.error)
    }

    const input: FileCreateInput = {
      name: file.name,
      type: getFileType(file.type),
      mimeType: file.type,
      size: file.size,
      folderId,
      ownerId,
      blob: file,
    }

    return getStorageAdapter().createFile(input)
  },

  async renameFile(id: string, name: string): Promise<FileRecord> {
    return getStorageAdapter().updateFile(id, { name } as FileUpdateInput)
  },

  async deleteFile(id: string): Promise<void> {
    return getStorageAdapter().deleteFile(id)
  },

  async deleteFiles(ids: string[]): Promise<void> {
    await Promise.all(ids.map((id) => getStorageAdapter().deleteFile(id)))
  },

  async moveFile(id: string, newFolderId: string): Promise<void> {
    return getStorageAdapter().moveFile(id, newFolderId)
  },

  /**
   * Downloads the given file and folder IDs as a single zip archive.
   * Folders are traversed recursively; the zip preserves directory structure.
   */
  async downloadAsZip(
    fileIds: string[],
    folderIds: string[],
    allFolders: Folder[],
    zipName = 'download.zip'
  ): Promise<void> {
    const adapter = getStorageAdapter()

    // Build a map for quick folder lookup
    const folderMap = new Map(allFolders.map((f) => [f.id, f]))

    // Compute the full path of a folder by walking up to its ancestor
    function getFolderPath(folderId: string): string {
      const parts: string[] = []
      let current: Folder | undefined = folderMap.get(folderId)
      while (current) {
        parts.unshift(current.name)
        current = current.parentId ? folderMap.get(current.parentId) : undefined
      }
      return parts.join('/')
    }

    // Recursively collect all file IDs within a folder subtree
    async function collectFilesInFolder(folderId: string): Promise<string[]> {
      const children = allFolders.filter((f) => f.parentId === folderId)
      const filesInFolder = await adapter.getFilesByFolder(folderId)
      const childFileIds: string[] = []
      for (const child of children) {
        childFileIds.push(...(await collectFilesInFolder(child.id)))
      }
      return [...filesInFolder.map((f) => f.id), ...childFileIds]
    }

    // Gather all file IDs to include (direct + from selected folders)
    const allFileIds = [...fileIds]
    for (const folderId of folderIds) {
      allFileIds.push(...(await collectFilesInFolder(folderId)))
    }
    const uniqueFileIds = [...new Set(allFileIds)]

    // Fetch full records (with blobs) and build zip entries
    const zipEntries: Record<string, Uint8Array> = {}

    await Promise.all(
      uniqueFileIds.map(async (id) => {
        const record = await adapter.getFileById(id)
        if (!record?.blob) return
        const arrayBuffer = await (record.blob as Blob).arrayBuffer()
        const uint8 = new Uint8Array(arrayBuffer)
        const folderPath = record.folderId ? getFolderPath(record.folderId) + '/' : ''
        zipEntries[folderPath + record.name] = uint8
      })
    )

    // If nothing to zip, bail out
    if (Object.keys(zipEntries).length === 0) return

    // Add placeholder for empty selected folders so they appear in the zip
    for (const folderId of folderIds) {
      const path = getFolderPath(folderId)
      const hasFiles = Object.keys(zipEntries).some((k) => k.startsWith(path + '/'))
      if (!hasFiles) {
        zipEntries[path + '/.keep'] = strToU8('')
      }
    }

    const zipped = zipSync(zipEntries)
    const blob = new Blob([zipped], { type: 'application/zip' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = zipName
    a.click()
    URL.revokeObjectURL(url)
  },
}
