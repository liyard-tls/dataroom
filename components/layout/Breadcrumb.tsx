'use client'

import { ChevronRight, Home } from 'lucide-react'
import { Folder } from '@/types/folder.types'
import { cn } from '@/lib/utils'

interface BreadcrumbProps {
  path: Folder[]
  onNavigate: (folderId: string | null) => void
  className?: string
}

export function Breadcrumb({ path, onNavigate, className }: BreadcrumbProps) {
  return (
    <nav className={cn('flex items-center gap-1 text-sm', className)}>
      <button
        onClick={() => onNavigate(null)}
        className={cn(
          'flex items-center gap-1 rounded-md px-2 py-1 transition-colors hover:bg-accent',
          path.length === 0 ? 'font-medium text-foreground' : 'text-muted-foreground'
        )}
      >
        <Home size={14} />
        <span>Root</span>
      </button>

      {path.map((folder) => (
        <div key={folder.id} className="flex items-center gap-1">
          <ChevronRight size={14} className="text-muted-foreground/50" />
          <button
            onClick={() => onNavigate(folder.id)}
            className="rounded-md px-2 py-1 transition-colors hover:bg-accent last:font-medium last:text-foreground"
          >
            {folder.name}
          </button>
        </div>
      ))}
    </nav>
  )
}
