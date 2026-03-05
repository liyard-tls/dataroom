'use client'

import { useState, useCallback } from 'react'
import { ChevronRight, ChevronDown, FolderPlus, Trash2, Pencil, Check, X } from 'lucide-react'
import { useDroppable } from '@dnd-kit/core'
import { motion, AnimatePresence } from 'framer-motion'
import { Folder } from '@/types/folder.types'
import { FileIcon } from '@/components/common/FileIcon'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface SidebarProps {
  folders: Folder[]
  currentFolderId: string | null
  onNavigate: (id: string | null) => void
  onCreateFolder: (name: string, parentId: string | null) => void
  onRenameFolder: (id: string, name: string) => void
  onDeleteFolder: (id: string) => void
}

interface FolderNodeProps {
  folder: Folder
  allFolders: Folder[]
  currentFolderId: string | null
  depth: number
  onNavigate: (id: string | null) => void
  onCreateFolder: (name: string, parentId: string | null) => void
  onRenameFolder: (id: string, name: string) => void
  onDeleteFolder: (id: string) => void
}

function FolderNode({
  folder,
  allFolders,
  currentFolderId,
  depth,
  onNavigate,
  onCreateFolder,
  onRenameFolder,
  onDeleteFolder,
}: FolderNodeProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [isRenaming, setIsRenaming] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [inputValue, setInputValue] = useState('')

  const children = allFolders.filter((f) => f.parentId === folder.id)
  const isActive = currentFolderId === folder.id

  // Makes this folder a drop target for DnD file/folder moves
  const { setNodeRef, isOver } = useDroppable({ id: `folder-${folder.id}` })

  function handleRenameSubmit() {
    if (inputValue.trim()) {
      onRenameFolder(folder.id, inputValue.trim())
    }
    setIsRenaming(false)
    setInputValue('')
  }

  function handleCreateSubmit() {
    if (inputValue.trim()) {
      onCreateFolder(inputValue.trim(), folder.id)
    }
    setIsCreating(false)
    setInputValue('')
  }

  function handleKeyDown(e: React.KeyboardEvent, onSubmit: () => void) {
    if (e.key === 'Enter') onSubmit()
    if (e.key === 'Escape') {
      setIsRenaming(false)
      setIsCreating(false)
      setInputValue('')
    }
  }

  return (
    <div ref={setNodeRef}>
      <div
        className={cn(
          'group flex items-center gap-1 rounded-md px-2 py-1.5 text-sm transition-colors',
          isActive && 'bg-primary/10 text-primary font-medium',
          !isActive && 'hover:bg-accent cursor-pointer',
          isOver && 'bg-primary/20 ring-1 ring-primary'
        )}
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
      >
        {/* Expand/collapse toggle */}
        <button
          onClick={() => setIsExpanded((v) => !v)}
          className="flex-shrink-0 p-0.5 text-muted-foreground hover:text-foreground"
        >
          {children.length > 0 ? (
            isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />
          ) : (
            <span className="w-3" />
          )}
        </button>

        {isRenaming ? (
          <div className="flex flex-1 items-center gap-1">
            <Input
              autoFocus
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => handleKeyDown(e, handleRenameSubmit)}
              className="h-6 text-xs"
            />
            <button onClick={handleRenameSubmit}><Check size={12} className="text-primary" /></button>
            <button onClick={() => setIsRenaming(false)}><X size={12} className="text-muted-foreground" /></button>
          </div>
        ) : (
          <>
            <button
              className="flex flex-1 items-center gap-2 overflow-hidden"
              onClick={() => onNavigate(folder.id)}
            >
              <FileIcon type="folder" size={14} />
              <span className="truncate">{folder.name}</span>
            </button>

            {/* Action buttons — visible on hover */}
            <div className="hidden items-center gap-0.5 group-hover:flex">
              <button
                onClick={() => { setIsCreating(true); setIsExpanded(true); setInputValue('') }}
                className="rounded p-0.5 hover:text-primary"
                title="New folder"
              >
                <FolderPlus size={12} />
              </button>
              <button
                onClick={() => { setIsRenaming(true); setInputValue(folder.name) }}
                className="rounded p-0.5 hover:text-primary"
                title="Rename"
              >
                <Pencil size={12} />
              </button>
              <button
                onClick={() => onDeleteFolder(folder.id)}
                className="rounded p-0.5 hover:text-destructive"
                title="Delete"
              >
                <Trash2 size={12} />
              </button>
            </div>
          </>
        )}
      </div>

      {/* Children + inline create input */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="overflow-hidden"
          >
            {isCreating && (
              <div className="flex items-center gap-1 px-2 py-1" style={{ paddingLeft: `${(depth + 1) * 12 + 8}px` }}>
                <FileIcon type="folder" size={14} />
                <Input
                  autoFocus
                  placeholder="Folder name"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={(e) => handleKeyDown(e, handleCreateSubmit)}
                  className="h-6 text-xs"
                />
                <button onClick={handleCreateSubmit}><Check size={12} className="text-primary" /></button>
                <button onClick={() => setIsCreating(false)}><X size={12} className="text-muted-foreground" /></button>
              </div>
            )}
            {children.map((child) => (
              <FolderNode
                key={child.id}
                folder={child}
                allFolders={allFolders}
                currentFolderId={currentFolderId}
                depth={depth + 1}
                onNavigate={onNavigate}
                onCreateFolder={onCreateFolder}
                onRenameFolder={onRenameFolder}
                onDeleteFolder={onDeleteFolder}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export function Sidebar({
  folders,
  currentFolderId,
  onNavigate,
  onCreateFolder,
  onRenameFolder,
  onDeleteFolder,
}: SidebarProps) {
  const [isCreatingRoot, setIsCreatingRoot] = useState(false)
  const [rootName, setRootName] = useState('')

  // Root is a drop target too
  const { setNodeRef: setRootRef, isOver: isRootOver } = useDroppable({ id: 'folder-root' })

  const rootFolders = folders.filter((f) => f.parentId === null)

  function handleRootCreate() {
    if (rootName.trim()) {
      onCreateFolder(rootName.trim(), null)
    }
    setIsCreatingRoot(false)
    setRootName('')
  }

  return (
    <aside className="flex h-full flex-col border-r bg-background">
      <div className="flex items-center justify-between border-b px-3 py-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Folders
        </span>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={() => { setIsCreatingRoot(true); setRootName('') }}
          title="New root folder"
        >
          <FolderPlus size={14} />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-1">
        {/* Root drop zone */}
        <div
          ref={setRootRef}
          className={cn(
            'mb-1 rounded-md px-2 py-1.5 text-sm transition-colors',
            currentFolderId === null && 'bg-primary/10 text-primary font-medium',
            currentFolderId !== null && 'hover:bg-accent cursor-pointer text-muted-foreground',
            isRootOver && 'bg-primary/20 ring-1 ring-primary'
          )}
          onClick={() => onNavigate(null)}
        >
          / Root
        </div>

        {isCreatingRoot && (
          <div className="flex items-center gap-1 px-2 py-1">
            <FileIcon type="folder" size={14} />
            <Input
              autoFocus
              placeholder="Folder name"
              value={rootName}
              onChange={(e) => setRootName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleRootCreate()
                if (e.key === 'Escape') setIsCreatingRoot(false)
              }}
              className="h-6 text-xs"
            />
            <button onClick={handleRootCreate}><Check size={12} className="text-primary" /></button>
            <button onClick={() => setIsCreatingRoot(false)}><X size={12} className="text-muted-foreground" /></button>
          </div>
        )}

        {rootFolders.map((folder) => (
          <FolderNode
            key={folder.id}
            folder={folder}
            allFolders={folders}
            currentFolderId={currentFolderId}
            depth={0}
            onNavigate={onNavigate}
            onCreateFolder={onCreateFolder}
            onRenameFolder={onRenameFolder}
            onDeleteFolder={onDeleteFolder}
          />
        ))}
      </div>
    </aside>
  )
}
