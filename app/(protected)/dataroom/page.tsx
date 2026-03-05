'use client'

import { useCallback, useEffect, useState } from 'react'
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
import { fileService } from '@/modules/files/services/file.service'
import { Button } from '@/components/ui/button'
import { PanelLeftOpen } from 'lucide-react'
import { useUIStore } from '@/store/uiStore'
import { useAuthStore } from '@/store/authStore'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { FileMetadata } from '@/types/file.types'

function DataRoomApp() {
  const router = useRouter()
  const { isSidebarCollapsed, toggleSidebar } = useUIStore()
  const user = useAuthStore((state) => state.user)
  const [allFiles, setAllFiles] = useState<FileMetadata[]>([])
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

  const loadAllFiles = useCallback(async () => {
    if (!user) {
      setAllFiles([])
      return
    }
    const data = await fileService.getFilesByOwner(user.uid)
    setAllFiles(data)
  }, [user])

  // Keep sidebar/main panel folder metadata in sync with file changes across the tree
  useEffect(() => {
    queueMicrotask(() => {
      void loadAllFiles()
    })
  }, [loadAllFiles, files, folders])

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
      <div className="flex h-screen overflow-hidden">
        {/* Sidebar — full height, contains logo + nav */}
        <div
          className={cn(
            'w-[22.5rem] flex-shrink-0 overflow-hidden transition-[margin] duration-300 ease-out',
            isSidebarCollapsed ? '-ml-[22.5rem]' : 'ml-0'
          )}
        >
          <Sidebar
            folders={folders}
            currentFolderId={currentFolderId}
            onNavigate={setCurrentFolderId}
            onCreateFolder={createFolder}
            onRenameFolder={renameFolder}
            onDeleteFolder={deleteFolder}
            isSidebarCollapsed={isSidebarCollapsed}
            onToggleSidebar={toggleSidebar}
            user={user}
            files={allFiles}
            onUploadFiles={uploadFiles}
            onOpenFile={openFile}
            onSignOut={handleSignOut}
          />
        </div>

        {/* Right side: header + content */}
        <div className="flex flex-1 flex-col overflow-hidden">
          <header className="flex items-center gap-2 border-b bg-background px-4 py-2">
            {isSidebarCollapsed && (
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={toggleSidebar}>
                <PanelLeftOpen size={15} />
              </Button>
            )}
            <SearchBar />
            <div className="flex-1" />
            <ThemeToggle />
          </header>

          <main className="relative flex-1 overflow-hidden">
            <MainPanel
              files={files}
              folders={folders}
              allFiles={allFiles}
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
