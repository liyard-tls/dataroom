import { FileType } from '@/types/file.types'

export type ViewerType = 'pdf' | 'image' | 'video' | 'text' | 'unsupported'

/** Maps a FileType to the appropriate viewer component */
export function getViewerType(fileType: FileType): ViewerType {
  switch (fileType) {
    case 'pdf':   return 'pdf'
    case 'image': return 'image'
    case 'video': return 'video'
    case 'text':
    case 'md':    return 'text'
    default:      return 'unsupported'
  }
}

/** Creates an object URL from a Blob — caller must revoke when done */
export function createObjectURL(blob: Blob): string {
  return URL.createObjectURL(blob)
}

export function revokeObjectURL(url: string): void {
  URL.revokeObjectURL(url)
}
