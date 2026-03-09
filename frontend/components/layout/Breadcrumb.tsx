'use client'

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { ChevronRight, Home, Ellipsis } from 'lucide-react'
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
        'flex shrink-0 items-center gap-1 rounded-md px-2 py-1 transition-colors',
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

/** Dropdown with hidden middle segments */
function EllipsisMenu({
  folders,
  onNavigate,
}: {
  folders: Folder[]
  onNavigate: (id: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState({ top: 0, left: 0 })
  const btnRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function onPointerDown(e: PointerEvent) {
      if (
        btnRef.current && btnRef.current.contains(e.target as Node)
      ) return
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [open])

  function handleToggle() {
    if (!open && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect()
      setPos({ top: rect.bottom + 4, left: rect.left })
    }
    setOpen((v) => !v)
  }

  return (
    <div className="flex shrink-0 items-center gap-1">
      <ChevronRight size={14} className="text-muted-foreground/50" />
      <button
        ref={btnRef}
        onClick={handleToggle}
        className="flex items-center rounded-md px-2 py-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        title="Show hidden folders"
      >
        <Ellipsis size={14} />
      </button>

      {open && typeof document !== 'undefined' && createPortal(
        <div
          ref={menuRef}
          style={{ position: 'fixed', top: pos.top, left: pos.left, zIndex: 9999 }}
          className="min-w-[10rem] overflow-hidden rounded-lg border bg-background py-1 shadow-lg"
        >
          {folders.map((f) => (
            <button
              key={f.id}
              onClick={() => { setOpen(false); onNavigate(f.id) }}
              className="flex w-full items-center gap-2 px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              <span className="truncate">{f.name}</span>
            </button>
          ))}
        </div>,
        document.body
      )}
    </div>
  )
}

export function Breadcrumb({ path, onNavigate, className }: BreadcrumbProps) {
  const navRef = useRef<HTMLElement>(null)
  // How many segments to hide from the start of path (after root)
  const [hiddenCount, setHiddenCount] = useState(0)

  useEffect(() => {
    if (path.length < 2) { setHiddenCount(0); return }

    const nav = navRef.current
    if (!nav) return

    function measure() {
      if (!nav) return

      // Binary search: find the smallest hiddenCount where nav doesn't overflow.
      // Start with 0 hidden — if it already fits, done.
      // Max hidden = path.length - 1 (always keep last segment visible).
      const max = path.length - 1

      // Try 0 first (common case)
      setHiddenCount(0)

      // Use rAF so the DOM reflects hiddenCount=0 before measuring
      requestAnimationFrame(() => {
        if (!nav) return
        if (nav.scrollWidth <= nav.clientWidth) {
          return // fits — nothing to do
        }
        // Doesn't fit with 0 hidden — find minimum hiddenCount that fits
        // Incrementally increase until it fits (max path.length-1 iterations, typically 1-3)
        let h = 1
        const tryNext = () => {
          setHiddenCount(h)
          requestAnimationFrame(() => {
            if (!nav) return
            if (nav.scrollWidth <= nav.clientWidth || h >= max) return
            h++
            tryNext()
          })
        }
        tryNext()
      })
    }

    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(nav)
    return () => ro.disconnect()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path.map(f => f.id).join(',')])

  const hiddenFolders = path.slice(0, hiddenCount)
  const visibleFolders = path.slice(hiddenCount)

  return (
    <nav ref={navRef} className={cn('flex min-w-0 items-center gap-1 overflow-hidden text-sm', className)}>
      <BreadcrumbItem
        id="breadcrumb-root"
        label={<><Home size={14} /><span>Root</span></>}
        isActive={path.length === 0}
        isRoot
        onClick={() => onNavigate(null)}
      />

      {hiddenCount > 0 && (
        <EllipsisMenu folders={hiddenFolders} onNavigate={onNavigate} />
      )}

      {visibleFolders.map((folder, i) => {
        const realIndex = hiddenCount + i
        return (
          <div key={folder.id} className="flex shrink-0 items-center gap-1">
            <ChevronRight size={14} className="text-muted-foreground/50" />
            <BreadcrumbItem
              id={`breadcrumb-folder-${folder.id}`}
              label={<span className="max-w-[12rem] truncate">{folder.name}</span>}
              isActive={realIndex === path.length - 1}
              onClick={() => onNavigate(folder.id)}
            />
          </div>
        )
      })}
    </nav>
  )
}
