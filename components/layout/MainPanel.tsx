'use client'

import { useState, useCallback } from 'react'
import { useDroppable } from '@dnd-kit/core'
import { motion, AnimatePresence } from 'framer-motion'
import { Upload, Trash2, ArrowUpDown } from 'lucide-react'
import { FileMetadata } from '@/types/file.types'
import { Folder } from '@/types/folder.types'
import { FileIcon } from '@/components/common/FileIcon'
import { Breadcrumb } from './Breadcrumb'
import { Button } from '@/components/ui/button'
import { formatFileSize } from '@/lib/fileHelpers'
import { useFileStore, SortField, SortDirection } from '@/store/fileStore'
import { cn } from '@/lib/utils'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface MainPanelProps {
  files: FileMetadata[]
  folders: Folder[]
  currentFolderId: string | null
  selectedIds: Set<string>
  isLoading: boolean
  breadcrumbPath: Folder[]
  onNavigate: (id: string | null) => void
  onOpenFile: (id: string) => void
  onRenameFile: (id: string, name: string) => void
  onDeleteFile: (id: string) => void
  onDeleteSelected: () => void
  onUpload: (files: File[]) => void
  onFolderOpen: (id: string) => void
  onFolderRename: (id: string, name: string) => void
  onFolderDelete: (id: string) => void
  onFolderCreate: (name: string, parentId: string | null) => void
  onToggleSelect: (id: string) => void
  onSelectAll: () => void
  onClearSelection: () => void
}

function EmptyState({ onUpload }: { onUpload: (files: File[]) => void }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 text-muted-foreground">
      <Upload size={40} className="opacity-30" />
      <p className="text-sm">Drop files here or click Upload</p>
      <label>
        <input
          type="file"
          multiple
          className="sr-only"
          onChange={(e) => e.target.files && onUpload(Array.from(e.target.files))}
        />
        <Button variant="outline" className="cursor-pointer" asChild>
          <span>Upload files</span>
        </Button>
      </label>
    </div>
  )
}

function FileRow({
  file,
  isSelected,
  onSelect,
  onOpen,
  onRename,
  onDelete,
}: {
  file: FileMetadata
  isSelected: boolean
  onSelect: () => void
  onOpen: () => void
  onRename: (name: string) => void
  onDelete: () => void
}) {
  const [isRenaming, setIsRenaming] = useState(false)
  const [nameValue, setNameValue] = useState(file.name)

  function handleRenameSubmit() {
    if (nameValue.trim() && nameValue !== file.name) {
      onRename(nameValue.trim())
    }
    setIsRenaming(false)
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      className={cn(
        'group flex items-center gap-3 rounded-lg px-3 py-2 transition-colors',
        isSelected ? 'bg-primary/10' : 'hover:bg-accent'
      )}
    >
      {/* Checkbox */}
      <input
        type="checkbox"
        checked={isSelected}
        onChange={onSelect}
        className="accent-primary"
        onClick={(e) => e.stopPropagation()}
      />

      <button className="flex flex-1 items-center gap-3 overflow-hidden text-left" onDoubleClick={onOpen}>
        <FileIcon type={file.type} size={18} className="flex-shrink-0" />

        {isRenaming ? (
          <input
            autoFocus
            value={nameValue}
            onChange={(e) => setNameValue(e.target.value)}
            onBlur={handleRenameSubmit}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleRenameSubmit()
              if (e.key === 'Escape') { setIsRenaming(false); setNameValue(file.name) }
            }}
            className="flex-1 rounded border border-primary bg-background px-1 text-sm outline-none"
          />
        ) : (
          <span className="flex-1 truncate text-sm">{file.name}</span>
        )}

        <span className="hidden text-xs text-muted-foreground md:block">{formatFileSize(file.size)}</span>
        <span className="hidden text-xs text-muted-foreground lg:block">
          {new Date(file.createdAt).toLocaleDateString()}
        </span>
      </button>

      {/* Actions */}
      <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onOpen} title="Open">
          <FileIcon type={file.type} size={14} />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={() => setIsRenaming(true)}
          title="Rename"
        >
          ✎
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 hover:text-destructive"
          onClick={onDelete}
          title="Delete"
        >
          <Trash2 size={14} />
        </Button>
      </div>
    </motion.div>
  )
}

export function MainPanel({
  files,
  folders,
  currentFolderId,
  selectedIds,
  isLoading,
  breadcrumbPath,
  onNavigate,
  onOpenFile,
  onRenameFile,
  onDeleteFile,
  onDeleteSelected,
  onUpload,
  onFolderOpen,
  onFolderRename,
  onFolderDelete,
  onFolderCreate,
  onToggleSelect,
  onSelectAll,
  onClearSelection,
}: MainPanelProps) {
  const { setSorting, sortField, sortDirection } = useFileStore()
  const [isDragOver, setIsDragOver] = useState(false)

  const { setNodeRef } = useDroppable({ id: `folder-${currentFolderId ?? 'root'}` })

  const childFolders = folders.filter((f) => f.parentId === currentFolderId)
  const isEmpty = files.length === 0 && childFolders.length === 0

  // Handle native browser file drag (from OS desktop)
  const handleDragOver = useCallback((e: React.DragEvent) => {
    if (e.dataTransfer.types.includes('Files')) {
      e.preventDefault()
      setIsDragOver(true)
    }
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    if (e.dataTransfer.files.length > 0) {
      onUpload(Array.from(e.dataTransfer.files))
    }
  }, [onUpload])

  function handleSortChange(field: SortField) {
    const newDir: SortDirection = sortField === field && sortDirection === 'asc' ? 'desc' : 'asc'
    setSorting(field, newDir)
  }

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'flex h-full flex-col transition-colors',
        isDragOver && 'bg-primary/5 ring-2 ring-inset ring-primary/30'
      )}
      onDragOver={handleDragOver}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={handleDrop}
    >
      {/* Toolbar */}
      <div className="flex items-center justify-between border-b px-4 py-2">
        <Breadcrumb path={breadcrumbPath} onNavigate={onNavigate} />

        <div className="flex items-center gap-2">
          {selectedIds.size > 0 && (
            <Button variant="destructive" size="sm" onClick={onDeleteSelected}>
              <Trash2 size={14} className="mr-1" />
              Delete ({selectedIds.size})
            </Button>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <ArrowUpDown size={14} className="mr-1" />
                Sort
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleSortChange('name')}>
                Name {sortField === 'name' && (sortDirection === 'asc' ? '↑' : '↓')}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleSortChange('size')}>
                Size {sortField === 'size' && (sortDirection === 'asc' ? '↑' : '↓')}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleSortChange('createdAt')}>
                Date {sortField === 'createdAt' && (sortDirection === 'asc' ? '↑' : '↓')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <label>
            <input
              type="file"
              multiple
              className="sr-only"
              onChange={(e) => e.target.files && onUpload(Array.from(e.target.files))}
            />
            <Button size="sm" className="cursor-pointer" asChild>
              <span>
                <Upload size={14} className="mr-1" />
                Upload
              </span>
            </Button>
          </label>
        </div>
      </div>

      {/* Column headers */}
      {!isEmpty && (
        <div className="flex items-center gap-3 border-b px-6 py-1.5 text-xs font-medium text-muted-foreground">
          <input
            type="checkbox"
            checked={selectedIds.size === files.length && files.length > 0}
            onChange={() => selectedIds.size === files.length ? onClearSelection() : onSelectAll()}
            className="accent-primary"
          />
          <span className="flex-1">Name</span>
          <span className="hidden w-20 text-right md:block">Size</span>
          <span className="hidden w-24 text-right lg:block">Created</span>
          <span className="w-24" />
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-2">
        {isLoading && (
          <div className="flex h-32 items-center justify-center">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        )}

        {!isLoading && isEmpty && <EmptyState onUpload={onUpload} />}

        {!isLoading && !isEmpty && (
          <>
            {/* Sub-folders */}
            <AnimatePresence>
              {childFolders.map((folder) => (
                <motion.div
                  key={folder.id}
                  layout
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="group flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-accent"
                >
                  <span className="w-4" />
                  <button
                    className="flex flex-1 items-center gap-3 overflow-hidden"
                    onDoubleClick={() => onFolderOpen(folder.id)}
                  >
                    <FileIcon type="folder" size={18} className="flex-shrink-0" />
                    <span className="flex-1 truncate text-sm">{folder.name}</span>
                  </button>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => {
                        const name = window.prompt('Rename folder', folder.name)
                        if (name) onFolderRename(folder.id, name)
                      }}
                    >
                      ✎
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 hover:text-destructive"
                      onClick={() => onFolderDelete(folder.id)}
                    >
                      <Trash2 size={14} />
                    </Button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {/* Files */}
            <AnimatePresence>
              {files.map((file) => (
                <FileRow
                  key={file.id}
                  file={file}
                  isSelected={selectedIds.has(file.id)}
                  onSelect={() => onToggleSelect(file.id)}
                  onOpen={() => onOpenFile(file.id)}
                  onRename={(name) => onRenameFile(file.id, name)}
                  onDelete={() => onDeleteFile(file.id)}
                />
              ))}
            </AnimatePresence>
          </>
        )}
      </div>

      {/* Drop overlay hint */}
      {isDragOver && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="rounded-xl bg-background/90 px-6 py-3 text-sm font-medium shadow-lg ring-1 ring-primary">
            Drop files to upload
          </div>
        </div>
      )}
    </div>
  )
}
