import { getStorageAdapter } from '@/modules/storage'
import { FileCreateInput, FileMetadata, FileRecord, FileUpdateInput } from '@/types/file.types'
import { getFileType, validateFileSize } from '@/lib/fileHelpers'

export const fileService = {
  async getFiles(folderId: string): Promise<FileMetadata[]> {
    return getStorageAdapter().getFilesByFolder(folderId)
  },

  async getFile(id: string): Promise<FileRecord | null> {
    return getStorageAdapter().getFileById(id)
  },

  /** Validates and uploads a browser File object into the data room */
  async uploadFile(file: File, folderId: string, ownerId: string): Promise<FileRecord> {
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
}
