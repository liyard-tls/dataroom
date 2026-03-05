"use client";

import { useCallback, useEffect, useState } from "react";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  pointerWithin,
  rectIntersection,
  useSensor,
  useSensors,
  type CollisionDetection,
} from "@dnd-kit/core";
import { AuthGuard } from "@/modules/auth";
import { useFolders } from "@/modules/folders/hooks/useFolders";
import { useFiles } from "@/modules/files/hooks/useFiles";
import { Sidebar } from "@/components/layout/Sidebar";
import { MainPanel } from "@/components/layout/MainPanel";
import { ViewerModal } from "@/modules/viewer/components/ViewerModal";
import { SearchBar } from "@/modules/search/components/SearchBar";
import { ThemeToggle } from "@/components/common/ThemeToggle";
import { Breadcrumb } from "@/components/layout/Breadcrumb";
import { buildBreadcrumb } from "@/modules/folders/services/folder.service";
import { useFileStore } from "@/store/fileStore";
import { authService } from "@/modules/auth";
import { fileService } from "@/modules/files/services/file.service";
import { Button } from "@/components/ui/button";
import { PanelLeftOpen, Download, Trash2 } from "lucide-react";
import { FileIcon } from "@/components/common/FileIcon";
import { useUIStore } from "@/store/uiStore";
import { useAuthStore } from "@/store/authStore";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { FileMetadata } from "@/types/file.types";

function DataRoomApp() {
  const router = useRouter();
  const { isSidebarCollapsed, toggleSidebar } = useUIStore();
  const user = useAuthStore((state) => state.user);
  const [allFiles, setAllFiles] = useState<FileMetadata[]>([]);
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
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
  } = useFolders();

  const { toggleSelection, selectAll, clearSelection, selectedIds, removeFile } =
    useFileStore();
  const {
    files,
    isLoading: filesLoading,
    loadFiles,
    uploadFiles,
    renameFile,
    deleteFile,
    deleteSelected,
    downloadSelected,
    openFile,
    moveFile,
  } = useFiles(currentFolderId);

  // Load folder tree on mount
  useEffect(() => {
    loadFolders();
  }, [loadFolders]);

  // Reload files when current folder changes
  useEffect(() => {
    loadFiles();
  }, [loadFiles, currentFolderId]);

  const loadAllFiles = useCallback(async () => {
    if (!user) {
      setAllFiles([]);
      return;
    }
    const data = await fileService.getFilesByOwner(user.uid);
    setAllFiles(data);
  }, [user]);

  // Keep allFiles in sync when folder list changes (folder moves/deletes)
  useEffect(() => {
    void loadAllFiles();
  }, [loadAllFiles, folders]);

  const breadcrumbPath = buildBreadcrumb(folders, currentFolderId);

  // DnD sensors — require 8px movement to start drag to avoid accidental drags on clicks
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  );

  // Try pointerWithin first (precise), fall back to rectIntersection (works even
  // when the pointer is over the DragOverlay or an overflow-hidden container)
  const collisionDetection: CollisionDetection = useCallback((args) => {
    const pointerHits = pointerWithin(args);
    if (pointerHits.length > 0) return pointerHits;
    return rectIntersection(args);
  }, []);

  function handleDragStart(event: DragStartEvent) {
    const id = event.active.id as string;
    const isFolder = folders.some((f) => f.id === id);
    const isFile = allFiles.some((f) => f.id === id);
    console.log("[dnd] dragStart", { id, type: isFolder ? "folder" : isFile ? "file" : "unknown" });
    setActiveDragId(id);
  }

  function handleDragCancel() {
    console.log("[dnd] dragCancel");
    setActiveDragId(null);
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveDragId(null);

    const { active, over } = event;
    console.log("[dnd] dragEnd", { activeId: active.id, overId: over?.id ?? null });

    if (!over) {
      console.log("[dnd] no drop target — cancelled");
      return;
    }

    const activeId = active.id as string;
    const overId = over.id as string;

    // Extract target folder ID from droppable ID.
    // "main-panel" carries the current folder in its data; sidebar uses "folder-<id>" / "folder-root"
    let targetFolderId: string | null;
    if (overId === "main-panel") {
      targetFolderId = (over.data.current as { folderId: string | null } | undefined)?.folderId ?? null;
      console.log("[dnd] dropped on main-panel, targetFolderId=", targetFolderId);
    } else if (overId === "folder-root" || overId === "folder-root-bottom" || overId.startsWith("file-root-")) {
      targetFolderId = null;
    } else if (overId.startsWith("folder-")) {
      targetFolderId = overId.replace("folder-", "");
    } else {
      console.log("[dnd] dropped on non-droppable target, ignoring:", overId);
      return;
    }

    // Determine if the dragged item is a file or folder
    const file = allFiles.find((f) => f.id === activeId);
    const isFile = !!file;
    const isFolder = folders.some((f) => f.id === activeId);

    console.log("[dnd] resolving", { isFile, isFolder, targetFolderId, currentFolderId: file?.folderId });

    if (isFile && file.folderId !== targetFolderId) {
      console.log("[dnd] moving file", activeId, "→", targetFolderId);
      // Optimistic update: remove from current folder list + update allFiles
      removeFile(activeId);
      setAllFiles((prev) =>
        prev.map((candidate) =>
          candidate.id === activeId
            ? { ...candidate, folderId: targetFolderId }
            : candidate,
        ),
      );
      moveFile(activeId, targetFolderId);
    } else if (isFolder && targetFolderId !== activeId) {
      console.log("[dnd] moving folder", activeId, "→", targetFolderId);
      moveFolder(activeId, targetFolderId);
    } else {
      console.log("[dnd] no-op: same location or unknown item");
    }
  }

  async function handleSignOut() {
    await authService.signOut();
    router.replace("/login");
  }

  const draggedFolder = activeDragId
    ? folders.find((f) => f.id === activeDragId)
    : undefined;
  const draggedFile = activeDragId
    ? allFiles.find((f) => f.id === activeDragId)
    : undefined;
  const draggedFolderHasContent =
    !!draggedFolder &&
    (folders.some((f) => f.parentId === draggedFolder.id) ||
      allFiles.some((f) => f.folderId === draggedFolder.id));

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={collisionDetection}
      onDragStart={handleDragStart}
      onDragCancel={handleDragCancel}
      onDragEnd={handleDragEnd}
    >
      <div className="flex h-screen overflow-hidden">
        {/* Sidebar — full height, contains logo + nav */}
        <div
          className={cn(
            "w-[22.5rem] flex-shrink-0 overflow-hidden transition-[margin] duration-300 ease-out",
            isSidebarCollapsed ? "-ml-[22.5rem]" : "ml-0",
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
            isDragging={activeDragId !== null}
          />
        </div>

        {/* Right side: header + content */}
        <div className="flex flex-1 flex-col overflow-hidden">
          <header className="flex items-center gap-3 border-b bg-background px-6 py-2.5">
            {isSidebarCollapsed && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0"
                onClick={toggleSidebar}
              >
                <PanelLeftOpen size={15} />
              </Button>
            )}
            <Breadcrumb
              path={breadcrumbPath}
              onNavigate={setCurrentFolderId}
              className="ml-7"
            />
            <div className="flex-1" />
            {selectedIds.size > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  {selectedIds.size} item{selectedIds.size !== 1 ? "s" : ""}{" "}
                  selected
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 gap-1.5"
                  onClick={() => downloadSelected(folders)}
                >
                  <Download size={13} />
                  Download
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 gap-1.5 border-destructive text-destructive hover:bg-destructive/10 hover:text-destructive"
                  onClick={deleteSelected}
                >
                  <Trash2 size={13} />
                  Delete
                </Button>
              </div>
            )}
            <SearchBar />
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

      <DragOverlay dropAnimation={null} zIndex={1200}>
        {draggedFolder && (
          <div className="pointer-events-none flex items-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-base text-foreground shadow-xl">
            <FileIcon
              type={draggedFolderHasContent ? "folder-filled" : "folder"}
              size={18}
            />
            <span className="max-w-[22rem] truncate">{draggedFolder.name}</span>
          </div>
        )}
        {draggedFile && (
          <div className="pointer-events-none flex items-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-base text-foreground shadow-xl">
            <FileIcon type={draggedFile.type} size={18} />
            <span className="max-w-[22rem] truncate">{draggedFile.name}</span>
          </div>
        )}
      </DragOverlay>

      <ViewerModal />
    </DndContext>
  );
}

export default function DataRoomPage() {
  return (
    <AuthGuard>
      <DataRoomApp />
    </AuthGuard>
  );
}
