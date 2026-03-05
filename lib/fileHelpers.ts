import { FileType, MIME_TO_FILE_TYPE, FILE_SIZE_LIMIT } from '@/types/file.types'

/** Determines FileType from a MIME string */
export function getFileType(mimeType: string): FileType {
  return MIME_TO_FILE_TYPE[mimeType] ?? 'other'
}

/** Returns a human-readable file size string */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

/** Validates file size against the 20MB limit */
export function validateFileSize(size: number): { valid: boolean; error?: string } {
  if (size > FILE_SIZE_LIMIT) {
    return {
      valid: false,
      error: `File size exceeds the 20MB limit (${formatFileSize(size)})`,
    }
  }
  return { valid: true }
}

/** Extracts file extension from a filename */
export function getFileExtension(name: string): string {
  const parts = name.split('.')
  return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : ''
}

/** Generates a unique ID — crypto.randomUUID with fallback */
export function generateId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  return Math.random().toString(36).slice(2) + Date.now().toString(36)
}
