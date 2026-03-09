import { getStorageAdapter } from '@/modules/storage'
import { SearchQuery, SearchResult } from '@/types/search.types'

export const searchService = {
  async search(query: SearchQuery): Promise<SearchResult[]> {
    if (!query.query.trim()) return []
    return getStorageAdapter().search(query)
  },
}
