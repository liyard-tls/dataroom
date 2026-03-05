'use client'

import { useEffect } from 'react'
import {
  DndContext,
  DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import { AuthGuard } from '@/modules/auth'
import { useFolders } from '@/modules/folders/hooks/useFolders'
import { useFiles } from '@/modules/files/hooks/useFiles'
import { Sidebar } from '@/components/layout/Sidebar'
import { MainPanel } from '@/components/layout/MainPanel'
import { ViewerModal } from '@/modules/viewer/components/ViewerModal'
import { SearchBar } from '@/modules/search/components/SearchBar'
import { ThemeToggle } from '@/components/common/ThemeToggle'
import { buildBreadcrumb } from '@/modules/folders/services/folder.service'
import { useFileStore } from '@/store/fileStore'
import { authService } from '@/modules/auth'
import { Button } from '@/components/ui/button'
import { LogOut, PanelLeftClose, PanelLeftOpen } from 'lucide-react'
import { useUIStore } from '@/store/uiStore'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'

function DataRoomApp() {
  const router = useRouter()
  const { isSidebarCollapsed, toggleSidebar } = useUIStore()
  const {
    folders,
    currentFolderId,
    isLoading: foldersLoading,
    loadFolders,
    createFolder,
    renameFolder,
    deleteFolder,
    moveFolder,
    setCurrentFolderId,
  } = useFolders()

  const { toggleSelection, selectAll, clearSelection, selectedIds } = useFileStore()
  const {
    files,
    isLoading: filesLoading,
    loadFiles,
    uploadFiles,
    renameFile,
    deleteFile,
    deleteSelected,
    openFile,
    moveFile,
  } = useFiles(currentFolderId)

  // Load folder tree on mount
  useEffect(() => { loadFolders() }, [loadFolders])

  // Reload files when current folder changes
  useEffect(() => { loadFiles() }, [loadFiles, currentFolderId])

  const breadcrumbPath = buildBreadcrumb(folders, currentFolderId)

  // DnD sensors — require 8px movement to start drag to avoid accidental drags on clicks
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over) return

    const activeId = active.id as string
    const overId = over.id as string // format: "folder-<id>" or "folder-root"

    // Extract target folder ID from droppable ID
    const targetFolderId = overId === 'folder-root' ? null : overId.replace('folder-', '')

    // Determine if the dragged item is a file or folder
    const isFile = files.some((f) => f.id === activeId)
    const isFolder = folders.some((f) => f.id === activeId)

    if (isFile && targetFolderId !== currentFolderId) {
      moveFile(activeId, targetFolderId ?? '')
    } else if (isFolder) {
      moveFolder(activeId, targetFolderId)
    }
  }

  async function handleSignOut() {
    await authService.signOut()
    router.replace('/login')
  }

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <div className="flex h-screen flex-col overflow-hidden">
        {/* Top navigation bar */}
        <header className="flex items-center gap-3 border-b bg-background px-4 py-2">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={toggleSidebar}>
            {isSidebarCollapsed ? <PanelLeftOpen size={15} /> : <PanelLeftClose size={15} />}
          </Button>

          <span className="font-semibold text-primary">Data Room</span>

          <div className="flex-1" />

          <SearchBar />
          <ThemeToggle />

          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleSignOut} title="Sign out">
            <LogOut size={15} />
          </Button>
        </header>

        {/* Main split layout */}
        <div className="flex flex-1 overflow-hidden">
          <div
            className={cn(
              'transition-all duration-200',
              isSidebarCollapsed ? 'w-0 overflow-hidden' : 'w-56 flex-shrink-0'
            )}
          >
            <Sidebar
              folders={folders}
              currentFolderId={currentFolderId}
              onNavigate={setCurrentFolderId}
              onCreateFolder={createFolder}
              onRenameFolder={renameFolder}
              onDeleteFolder={deleteFolder}
            />
          </div>

          <main className="relative flex-1 overflow-hidden">
            <MainPanel
              files={files}
              folders={folders}
              currentFolderId={currentFolderId}
              selectedIds={selectedIds}
              isLoading={filesLoading || foldersLoading}
              breadcrumbPath={breadcrumbPath}
              onNavigate={setCurrentFolderId}
              onOpenFile={openFile}
              onRenameFile={renameFile}
              onDeleteFile={deleteFile}
              onDeleteSelected={deleteSelected}
              onUpload={uploadFiles}
              onFolderOpen={setCurrentFolderId}
              onFolderRename={renameFolder}
              onFolderDelete={deleteFolder}
              onFolderCreate={createFolder}
              onToggleSelect={toggleSelection}
              onSelectAll={selectAll}
              onClearSelection={clearSelection}
            />
          </main>
        </div>
      </div>

      <ViewerModal />
    </DndContext>
  )
}

export default function DataRoomPage() {
  return (
    <AuthGuard>
      <DataRoomApp />
    </AuthGuard>
  )
}
