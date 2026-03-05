'use client'

import { Search, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { useUIStore } from '@/store/uiStore'
import { useSearch } from '../hooks/useSearch'
import { useFolderStore } from '@/store/folderStore'
import { FileIcon } from '@/components/common/FileIcon'
import { AnimatePresence, motion } from 'framer-motion'

export function SearchBar() {
  const { searchQuery, setSearchQuery } = useUIStore()
  const { setCurrentFolderId } = useFolderStore()
  const { results, isLoading } = useSearch(searchQuery)

  const isOpen = searchQuery.trim().length > 0

  function handleResultClick(folderId: string | null, type: 'file' | 'folder') {
    if (type === 'folder') {
      // Navigate to the folder's parent, then open the folder
      setCurrentFolderId(folderId)
    } else {
      setCurrentFolderId(folderId)
    }
    setSearchQuery('')
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
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search files and folders..."
          className="pl-8 pr-8 text-sm"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-2.5 text-muted-foreground hover:text-foreground"
          >
            <X size={14} />
          </button>
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
          >
            {results.length === 0 && !isLoading && (
              <p className="px-3 py-2 text-sm text-muted-foreground">No results found</p>
            )}
            {results.map((result) => (
              <button
                key={`${result.type}-${result.id}`}
                onClick={() => handleResultClick(result.folderId, result.type)}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-accent"
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
}
