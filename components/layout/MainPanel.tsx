'use client'

import { useState, useCallback } from 'react'
import { useDroppable } from '@dnd-kit/core'
import { motion, AnimatePresence } from 'framer-motion'
import { Upload, Trash2, ArrowUpDown, MoreHorizontal, FolderOpen, Pencil, Eye } from 'lucide-react'
import { FileMetadata } from '@/types/file.types'
import { Folder } from '@/types/folder.types'
import { FileIcon } from '@/components/common/FileIcon'
import { Breadcrumb } from './Breadcrumb'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { formatFileSize, formatModifiedDate } from '@/lib/fileHelpers'
import { useFileStore, SortField, SortDirection } from '@/store/fileStore'
import { cn } from '@/lib/utils'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface MainPanelProps {
  files: FileMetadata[]
  folders: Folder[]
  allFiles: FileMetadata[]
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

// Shared column widths — identical in header and every row
const COL_NAME = 'flex-1 min-w-0'
const COL_SIZE = 'w-24 shrink-0 text-right'
const COL_DATE = 'w-36 shrink-0 text-right'
// Actions column always takes up space so rows never shift when menu opens/closes
const COL_ACTIONS = 'w-7 shrink-0'
const ROW_PX = 'px-3'

function stopRowPropagation(e: React.SyntheticEvent) {
  e.stopPropagation()
}

function EmptyState({ onUpload }: { onUpload: (files: File[]) => void }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 text-muted-foreground">
      <Upload size={40} className="opacity-30" />
      <p className="text-sm">Drop files here or click Upload</p>
      <label>
        <input type="file" multiple className="sr-only" onChange={(e) => e.target.files && onUpload(Array.from(e.target.files))} />
        <Button variant="outline" className="cursor-pointer" asChild>
          <span>Upload files</span>
        </Button>
      </label>
    </div>
  )
}

function FolderRow({
  folder,
  isNotEmpty,
  isSelected,
  onSelect,
  onOpen,
  onRename,
  onDelete,
}: {
  folder: Folder
  isNotEmpty: boolean
  isSelected: boolean
  onSelect: () => void
  onOpen: () => void
  onRename: (name: string) => void
  onDelete: () => void
}) {
  const [isRenaming, setIsRenaming] = useState(false)
  const [nameValue, setNameValue] = useState(folder.name)

  function handleRenameSubmit() {
    const trimmed = nameValue.trim()
    if (trimmed && trimmed !== folder.name) onRename(trimmed)
    setIsRenaming(false)
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className={cn(
        'group flex items-center gap-3 rounded-lg py-2 transition-colors',
        ROW_PX,
        isSelected ? 'bg-primary/10' : 'hover:bg-accent',
      )}
      onDoubleClick={onOpen}
    >
      <div
        className="flex w-6 shrink-0 items-center justify-center"
        onClick={stopRowPropagation}
        onPointerDown={stopRowPropagation}
        onDoubleClick={stopRowPropagation}
      >
        <Checkbox
          checked={isSelected}
          onCheckedChange={onSelect}
          className={cn(isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100')}
        />
      </div>

      <div className={cn('flex items-center gap-2 overflow-hidden', COL_NAME)}>
        <FileIcon type={isNotEmpty ? 'folder-filled' : 'folder'} size={20} className="shrink-0" />
        {isRenaming ? (
          <input
            autoFocus
            value={nameValue}
            onChange={(e) => setNameValue(e.target.value)}
            onBlur={handleRenameSubmit}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleRenameSubmit()
              if (e.key === 'Escape') { setIsRenaming(false); setNameValue(folder.name) }
            }}
            className="flex-1 rounded border border-primary bg-background px-1 text-sm outline-none"
            onClick={stopRowPropagation}
          />
        ) : (
          <span className="truncate text-sm">{folder.name}</span>
        )}
      </div>

      <span className={cn('text-xs text-muted-foreground', COL_SIZE)}>—</span>
      <span className={cn('text-xs text-muted-foreground', COL_DATE)}>
        {formatModifiedDate(folder.updatedAt)}
      </span>

      <div className={COL_ACTIONS}>
        {/* modal=false prevents Radix from adding padding-right to body on open */}
        <DropdownMenu modal={false}>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 opacity-0 transition-opacity group-hover:opacity-100 data-[state=open]:opacity-100"
              onClick={stopRowPropagation}
              onDoubleClick={stopRowPropagation}
            >
              <MoreHorizontal size={15} />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuItem onClick={onOpen}>
              <FolderOpen size={14} className="mr-2" /> Open
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => { setIsRenaming(true); setNameValue(folder.name) }}>
              <Pencil size={14} className="mr-2" /> Rename
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onDelete} className="text-destructive focus:text-destructive">
              <Trash2 size={14} className="mr-2" /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </motion.div>
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
    const trimmed = nameValue.trim()
    if (trimmed && trimmed !== file.name) onRename(trimmed)
    setIsRenaming(false)
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      className={cn(
        'group flex items-center gap-3 rounded-lg py-2 transition-colors',
        ROW_PX,
        isSelected ? 'bg-primary/10' : 'hover:bg-accent',
      )}
      onDoubleClick={onOpen}
    >
      <div
        className="flex w-6 shrink-0 items-center justify-center"
        onClick={stopRowPropagation}
        onPointerDown={stopRowPropagation}
        onDoubleClick={stopRowPropagation}
      >
        <Checkbox
          checked={isSelected}
          onCheckedChange={onSelect}
          className={cn(isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100')}
        />
      </div>

      <div className={cn('flex items-center gap-2 overflow-hidden', COL_NAME)}>
        <FileIcon type={file.type} size={18} className="shrink-0" />
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
            onClick={stopRowPropagation}
          />
        ) : (
          <span className="truncate text-sm">{file.name}</span>
        )}
      </div>

      <span className={cn('text-xs text-muted-foreground', COL_SIZE)}>
        {formatFileSize(file.size)}
      </span>

      <span className={cn('text-xs text-muted-foreground', COL_DATE)}>
        {formatModifiedDate(file.updatedAt)}
      </span>

      <div className={COL_ACTIONS}>
        {/* modal=false prevents Radix from adding padding-right to body on open */}
        <DropdownMenu modal={false}>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 opacity-0 transition-opacity group-hover:opacity-100 data-[state=open]:opacity-100"
              onClick={stopRowPropagation}
              onDoubleClick={stopRowPropagation}
            >
              <MoreHorizontal size={15} />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuItem onClick={onOpen}>
              <Eye size={14} className="mr-2" /> Open
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => { setIsRenaming(true); setNameValue(file.name) }}>
              <Pencil size={14} className="mr-2" /> Rename
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onDelete} className="text-destructive focus:text-destructive">
              <Trash2 size={14} className="mr-2" /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </motion.div>
  )
}

export function MainPanel({
  files,
  folders,
  allFiles,
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
  onFolderCreate: _onFolderCreate,
  onToggleSelect,
  onSelectAll: _onSelectAll,
  onClearSelection,
}: MainPanelProps) {
  const { setSorting, sortField, sortDirection } = useFileStore()
  const [isDragOver, setIsDragOver] = useState(false)

  const { setNodeRef } = useDroppable({ id: `folder-${currentFolderId ?? 'root'}` })

  const childFolders = folders.filter((f) => f.parentId === currentFolderId)
  const isEmpty = files.length === 0 && childFolders.length === 0

  const totalItems = files.length + childFolders.length
  const allSelected = totalItems > 0 && selectedIds.size === totalItems
  const someSelected = selectedIds.size > 0 && !allSelected

  const handleDragOver = useCallback((e: React.DragEvent) => {
    if (e.dataTransfer.types.includes('Files')) {
      e.preventDefault()
      setIsDragOver(true)
    }
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    if (e.dataTransfer.files.length > 0) onUpload(Array.from(e.dataTransfer.files))
  }, [onUpload])

  function handleSortChange(field: SortField) {
    const newDir: SortDirection = sortField === field && sortDirection === 'asc' ? 'desc' : 'asc'
    setSorting(field, newDir)
  }

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'relative flex h-full flex-col transition-colors',
        isDragOver && 'bg-primary/5 ring-2 ring-inset ring-primary/30',
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

          <DropdownMenu modal={false}>
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
                Modified {sortField === 'createdAt' && (sortDirection === 'asc' ? '↑' : '↓')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <label>
            <input type="file" multiple className="sr-only" onChange={(e) => e.target.files && onUpload(Array.from(e.target.files))} />
            <Button size="sm" className="cursor-pointer" asChild>
              <span><Upload size={14} className="mr-1" />Upload</span>
            </Button>
          </label>
        </div>
      </div>

      {/* Column headers — px, gap identical to rows */}
      {!isEmpty && (
        <div className={cn('flex items-center gap-3 border-b bg-muted/30 py-1.5 text-xs font-medium text-muted-foreground', ROW_PX)}>
          <div
            className="flex w-6 shrink-0 items-center justify-center"
            onClick={stopRowPropagation}
            onPointerDown={stopRowPropagation}
          >
            <Checkbox
              checked={someSelected ? 'indeterminate' : allSelected}
              onCheckedChange={() => {
                if (allSelected) {
                  onClearSelection()
                } else {
                  const allIds = [...files.map((f) => f.id), ...childFolders.map((f) => f.id)]
                  allIds.forEach((id) => { if (!selectedIds.has(id)) onToggleSelect(id) })
                }
              }}
            />
          </div>
          <span className={COL_NAME}>Name</span>
          <span className={COL_SIZE}>Size</span>
          <span className={COL_DATE}>Modified</span>
          <span className={COL_ACTIONS} />
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto py-1">
        {isLoading && (
          <div className="flex h-32 items-center justify-center">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        )}

        {!isLoading && isEmpty && <EmptyState onUpload={onUpload} />}

        {!isLoading && !isEmpty && (
          <>
            <AnimatePresence>
              {childFolders.map((folder) => (
                <FolderRow
                  key={folder.id}
                  folder={folder}
                  isNotEmpty={
                    folders.some((candidate) => candidate.parentId === folder.id) ||
                    allFiles.some((file) => file.folderId === folder.id)
                  }
                  isSelected={selectedIds.has(folder.id)}
                  onSelect={() => onToggleSelect(folder.id)}
                  onOpen={() => onFolderOpen(folder.id)}
                  onRename={(name) => onFolderRename(folder.id, name)}
                  onDelete={() => onFolderDelete(folder.id)}
                />
              ))}
            </AnimatePresence>

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
