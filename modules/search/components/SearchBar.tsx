'use client'

import { forwardRef, useState, useCallback } from 'react'
import { Search, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { useUIStore } from '@/store/uiStore'
import { useSearch } from '../hooks/useSearch'
import { FileIcon } from '@/components/common/FileIcon'
import { AnimatePresence, motion } from 'framer-motion'
import { KbdShortcut } from '@/components/common/KbdShortcut'
import { cn } from '@/lib/utils'
import { SearchResult } from '@/types/search.types'

interface SearchBarProps {
  onSelect?: (result: SearchResult) => void
}

export const SearchBar = forwardRef<HTMLInputElement, SearchBarProps>(function SearchBar(
  { onSelect },
  ref,
) {
  const { searchQuery, setSearchQuery } = useUIStore()
  const { results, isLoading } = useSearch(searchQuery)
  const [activeIndex, setActiveIndex] = useState(-1)

  const isOpen = searchQuery.trim().length > 0

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setSearchQuery(e.target.value)
      setActiveIndex(-1)
    },
    [setSearchQuery],
  )

  function handleSelect(result: SearchResult) {
    onSelect?.(result)
    setSearchQuery('')
    setActiveIndex(-1)
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!isOpen || results.length === 0) return

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex((i) => (i < results.length - 1 ? i + 1 : 0))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex((i) => (i > 0 ? i - 1 : results.length - 1))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const target = activeIndex >= 0 ? results[activeIndex] : results[0]
      if (target) handleSelect(target)
    } else if (e.key === 'Escape') {
      setSearchQuery('')
      setActiveIndex(-1)
    }
  }

  return (
    <div className="relative w-72">
      <div className="relative flex items-center">
        {isLoading ? (
          <div className="absolute left-2.5 h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        ) : (
          <Search size={15} className="absolute left-2.5 text-muted-foreground" />
        )}
        <Input
          ref={ref}
          value={searchQuery}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder="Search files and folders..."
          className="pl-8 pr-16 text-sm"
          role="combobox"
          aria-expanded={isOpen}
          aria-autocomplete="list"
        />
        {searchQuery ? (
          <button
            onClick={() => {
              setSearchQuery('')
              setActiveIndex(-1)
            }}
            className="absolute right-2.5 text-muted-foreground hover:text-foreground"
          >
            <X size={14} />
          </button>
        ) : (
          <KbdShortcut keys={['ctrl', 'f']} className="absolute right-2.5 ml-0" />
        )}
      </div>

      {/* Search results dropdown */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.1 }}
            className="absolute top-full z-50 mt-1 w-full overflow-hidden rounded-lg border bg-background shadow-lg"
            role="listbox"
          >
            {results.length === 0 && !isLoading && (
              <p className="px-3 py-2 text-sm text-muted-foreground">No results found</p>
            )}
            {results.map((result, i) => (
              <button
                key={`${result.type}-${result.id}`}
                onClick={() => handleSelect(result)}
                onMouseEnter={() => setActiveIndex(i)}
                className={cn(
                  'flex w-full items-center gap-2 px-3 py-2 text-left text-sm',
                  i === activeIndex ? 'bg-accent' : 'hover:bg-accent',
                )}
                role="option"
                aria-selected={i === activeIndex}
              >
                <FileIcon
                  type={result.type === 'folder' ? 'folder' : (result.fileType ?? 'other')}
                  size={14}
                />
                <span className="truncate">{result.name}</span>
                <span className="ml-auto text-xs text-muted-foreground">{result.type}</span>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
})
