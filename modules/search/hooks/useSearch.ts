'use client'

import { useState, useEffect } from 'react'
import { useDebounce } from '@/hooks/useDebounce'
import { useAuth } from '@/modules/auth'
import { searchService } from '../services/search.service'
import { SearchResult } from '@/types/search.types'
import { FileType } from '@/types/file.types'

export function useSearch(query: string, fileTypeFilter?: FileType) {
  const { user } = useAuth()
  const debouncedQuery = useDebounce(query, 300)
  const [results, setResults] = useState<SearchResult[]>([])
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (!user || !debouncedQuery.trim()) {
      setResults([])
      return
    }

    setIsLoading(true)
    searchService
      .search({ query: debouncedQuery, ownerId: user.uid, fileTypeFilter })
      .then(setResults)
      .catch(() => setResults([]))
      .finally(() => setIsLoading(false))
  }, [debouncedQuery, fileTypeFilter, user])

  return { results, isLoading }
}
