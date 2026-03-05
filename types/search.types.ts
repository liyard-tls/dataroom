import { FileType } from './file.types'

export interface SearchResult {
  id: string
  name: string
  type: 'file' | 'folder'
  folderId: string | null
  fileType?: FileType // only for file results
  mimeType?: string
}

export interface SearchQuery {
  query: string
  ownerId: string
  fileTypeFilter?: FileType // optional filter by file type
}
