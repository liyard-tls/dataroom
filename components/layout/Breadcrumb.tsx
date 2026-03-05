'use client'

import { ChevronRight, Home } from 'lucide-react'
import { Folder } from '@/types/folder.types'
import { cn } from '@/lib/utils'

interface BreadcrumbProps {
  path: Folder[]
  onNavigate: (folderId: string | null) => void
}

export function Breadcrumb({ path, onNavigate }: BreadcrumbProps) {
  return (
    <nav className="flex items-center gap-1 text-sm">
      <button
        onClick={() => onNavigate(null)}
        className={cn(
          'flex items-center gap-1 rounded px-1.5 py-1 transition-colors hover:bg-accent hover:text-accent-foreground',
          path.length === 0 && 'font-medium text-foreground'
        )}
      >
        <Home size={14} />
        <span>Root</span>
      </button>

      {path.map((folder) => (
        <div key={folder.id} className="flex items-center gap-1">
          <ChevronRight size={14} className="text-muted-foreground" />
          <button
            onClick={() => onNavigate(folder.id)}
            className="rounded px-1.5 py-1 transition-colors hover:bg-accent hover:text-accent-foreground last:font-medium last:text-foreground"
          >
            {folder.name}
          </button>
        </div>
      ))}
    </nav>
  )
}
