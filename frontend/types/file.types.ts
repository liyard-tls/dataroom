export type FileType = 'pdf' | 'image' | 'video' | 'text' | 'md' | 'other'

export interface FileRecord {
  id: string
  name: string
  type: FileType
  mimeType: string
  size: number // bytes
  folderId: string | null
  ownerId: string
  blob: Blob // binary data stored in IndexedDB
  createdAt: Date
  updatedAt: Date
}

// Metadata without blob — used for listings to avoid loading binary data unnecessarily
export type FileMetadata = Omit<FileRecord, 'blob'>

export type FileCreateInput = Omit<FileRecord, 'id' | 'createdAt' | 'updatedAt'>
export type FileUpdateInput = Pick<FileRecord, 'name'>

export const FILE_SIZE_LIMIT = 20 * 1024 * 1024 // 20MB in bytes

export const MIME_TO_FILE_TYPE: Record<string, FileType> = {
  'application/pdf': 'pdf',
  'image/png': 'image',
  'image/jpeg': 'image',
  'image/gif': 'image',
  'image/webp': 'image',
  'image/svg+xml': 'image',
  'video/mp4': 'video',
  'video/webm': 'video',
  'video/ogg': 'video',
  'text/plain': 'text',
  'text/markdown': 'md',
  'application/json': 'text',
  'text/javascript': 'text',
  'text/typescript': 'text',
  'text/html': 'text',
  'text/css': 'text',
}
