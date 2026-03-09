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

/** Formats a date as relative time if within 24h, otherwise as localized date+time */
export function formatModifiedDate(date: Date): string {
  const now = Date.now()
  const diffMs = now - new Date(date).getTime()
  const diffH = diffMs / (1000 * 60 * 60)
  if (diffH < 1) {
    const diffM = Math.floor(diffMs / (1000 * 60))
    return diffM <= 1 ? 'just now' : `${diffM}m ago`
  }
  if (diffH < 24) return `${Math.floor(diffH)}h ago`
  return new Date(date).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
    + ' ' + new Date(date).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
}

/**
 * Returns a name that does not conflict with existing names in the same folder.
 * For files, the counter is inserted before the extension: "file (1).txt".
 * For folders (or extensionless files), the counter is appended: "folder (1)".
 * Comparison is case-insensitive.
 */
export function uniqueName(desired: string, existingNames: string[]): string {
  const lower = existingNames.map((n) => n.toLowerCase())
  if (!lower.includes(desired.toLowerCase())) return desired

  const dotIndex = desired.lastIndexOf('.')
  const hasExt = dotIndex > 0
  const base = hasExt ? desired.slice(0, dotIndex) : desired
  const ext = hasExt ? desired.slice(dotIndex) : ''

  let counter = 1
  let candidate: string
  do {
    candidate = `${base} (${counter})${ext}`
    counter++
  } while (lower.includes(candidate.toLowerCase()))

  return candidate
}

/** Generates a unique ID — crypto.randomUUID with fallback */
export function generateId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  return Math.random().toString(36).slice(2) + Date.now().toString(36)
}
