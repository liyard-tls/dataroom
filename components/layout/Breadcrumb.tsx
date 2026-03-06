'use client'

import { ChevronRight, Home } from 'lucide-react'
import { useDroppable } from '@dnd-kit/core'
import { Folder } from '@/types/folder.types'
import { cn } from '@/lib/utils'

interface BreadcrumbProps {
  path: Folder[]
  onNavigate: (folderId: string | null) => void
  className?: string
}

function BreadcrumbItem({
  id,
  label,
  isActive,
  isRoot,
  onClick,
}: {
  id: string
  label: React.ReactNode
  isActive: boolean
  isRoot?: boolean
  onClick: () => void
}) {
  const { setNodeRef, isOver } = useDroppable({ id })

  return (
    <button
      ref={setNodeRef}
      onClick={onClick}
      className={cn(
        'flex items-center gap-1 rounded-md px-2 py-1 transition-colors',
        isRoot ? 'text-muted-foreground hover:bg-accent' : 'hover:bg-accent',
        isActive && 'font-medium text-foreground',
        !isActive && !isRoot && 'text-muted-foreground',
        isOver && 'bg-primary/15 ring-1 ring-inset ring-primary/40',
      )}
    >
      {label}
    </button>
  )
}

export function Breadcrumb({ path, onNavigate, className }: BreadcrumbProps) {
  return (
    <nav className={cn('flex items-center gap-1 text-sm', className)}>
      <BreadcrumbItem
        id="breadcrumb-root"
        label={<><Home size={14} /><span>Root</span></>}
        isActive={path.length === 0}
        isRoot
        onClick={() => onNavigate(null)}
      />

      {path.map((folder, i) => (
        <div key={folder.id} className="flex items-center gap-1">
          <ChevronRight size={14} className="text-muted-foreground/50" />
          <BreadcrumbItem
            id={`breadcrumb-folder-${folder.id}`}
            label={folder.name}
            isActive={i === path.length - 1}
            onClick={() => onNavigate(folder.id)}
          />
        </div>
      ))}
    </nav>
  )
}
