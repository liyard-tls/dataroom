'use client'

import { RefObject } from 'react'
import { useHotkeys } from 'react-hotkeys-hook'
import { useUIStore } from '@/store/uiStore'
import { useFileStore } from '@/store/fileStore'

interface UseGlobalHotkeysOptions {
  onUpload: () => void
  onCreateFolder: () => void
  onDeleteSelected: () => void
  onSelectAll: () => void
  onNavigateUp: () => void
  onImportFromDrive?: () => void
  searchInputRef: RefObject<HTMLInputElement | null>
}

export const NEW_FOLDER_HOTKEY = 'ctrl+shift+f, meta+shift+f'

export function useGlobalHotkeys({
  onUpload,
  onCreateFolder,
  onDeleteSelected,
  onSelectAll,
  onNavigateUp,
  onImportFromDrive,
  searchInputRef,
}: UseGlobalHotkeysOptions) {
  const { closeViewer, viewerFile, toggleSidebar } = useUIStore()
  const { selectedIds, clearSelection } = useFileStore()

  // Escape — close viewer or clear selection; also blur focused element and clear text selection
  useHotkeys(
    'escape',
    () => {
      if (viewerFile) {
        closeViewer()
      } else {
        ;(document.activeElement as HTMLElement | null)?.blur()
        window.getSelection()?.removeAllRanges()
        if (selectedIds.size > 0) {
          clearSelection()
        }
      }
    },
    { preventDefault: true },
    [viewerFile, selectedIds],
  )

  // Ctrl+U — upload files
  useHotkeys('ctrl+u, meta+u', onUpload, { preventDefault: true }, [onUpload])

  // Ctrl+Shift+F — create folder (Ctrl+Shift+N conflicts with Chrome incognito)
  useHotkeys('ctrl+shift+f, meta+shift+f', onCreateFolder, { preventDefault: true }, [onCreateFolder])

  // Delete — delete selected files (not inside inputs)
  useHotkeys(
    'delete',
    onDeleteSelected,
    {
      enabled: selectedIds.size > 0,
      ignoreEventWhen: (e) => {
        const tag = (e.target as HTMLElement).tagName
        return tag === 'INPUT' || tag === 'TEXTAREA'
      },
    },
    [selectedIds, onDeleteSelected],
  )

  // Ctrl+A — select all
  useHotkeys('ctrl+a, meta+a', onSelectAll, { preventDefault: true }, [onSelectAll])

  // Ctrl+F or / — focus search input
  useHotkeys(
    'ctrl+f, meta+f',
    () => {
      searchInputRef.current?.focus()
      searchInputRef.current?.select()
    },
    { preventDefault: true },
    [searchInputRef],
  )

  // Ctrl+B — toggle sidebar
  useHotkeys('ctrl+b, meta+b', toggleSidebar, { preventDefault: true }, [toggleSidebar])

  // Ctrl+Shift+G — import from Google Drive
  useHotkeys(
    'ctrl+shift+g, meta+shift+g',
    () => onImportFromDrive?.(),
    { preventDefault: true, enabled: !!onImportFromDrive },
    [onImportFromDrive],
  )

  // Backspace (no modifier, not in input) — navigate to parent folder
  useHotkeys(
    'backspace',
    onNavigateUp,
    {
      ignoreEventWhen: (e) => {
        const tag = (e.target as HTMLElement).tagName
        return tag === 'INPUT' || tag === 'TEXTAREA'
      },
    },
    [onNavigateUp],
  )
}
