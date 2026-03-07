"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useGlobalHotkeys } from "@/hooks/useGlobalHotkeys";
import { useRouter } from "next/navigation";
import { usePathname } from "next/navigation";
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
import { GoogleDriveModal } from "@/modules/gdrive/GoogleDriveModal";
import { MainPanel } from "@/components/layout/MainPanel";
import { ViewerModal } from "@/modules/viewer/components/ViewerModal";
import { UploadProgressPanel } from "@/components/common/UploadProgressPanel";
import { SearchBar } from "@/modules/search/components/SearchBar";
import { ThemeToggle } from "@/components/common/ThemeToggle";
import { Breadcrumb } from "@/components/layout/Breadcrumb";
import { buildBreadcrumb } from "@/modules/folders/services/folder.service";
import { useFileStore } from "@/store/fileStore";
import { authService } from "@/modules/auth";
import { fileService } from "@/modules/files/services/file.service";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  PanelLeftOpen,
  PanelLeftClose,
  Download,
  Trash2,
  LayoutGrid,
  List,
  ArrowUpDown,
  ListFilter,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import { FileType } from "@/types/file.types";
import { FileIcon } from "@/components/common/FileIcon";
import { KbdShortcut } from "@/components/common/KbdShortcut";
import { useUIStore } from "@/store/uiStore";
import { useAuthStore } from "@/store/authStore";
import { cn } from "@/lib/utils";
import { Folder } from "@/types/folder.types";
import { resolveFolderPath, useFolderNavigation } from "@/hooks/useFolderPath";
import {
  invalidateFolderCache,
  invalidateAllFolderCache,
} from "@/modules/files/hooks/useFiles";
import { uniqueName } from "@/lib/fileHelpers";
import { ShareModal } from "@/modules/sharing/components/ShareModal";

function isFolderDescendant(
  folderId: string,
  targetId: string | null,
  folders: Folder[],
): boolean {
  if (!targetId) return false;
  if (folderId === targetId) return true;
  const target = folders.find((f) => f.id === targetId);
  if (!target) return false;
  return isFolderDescendant(folderId, target.parentId, folders);
}

function DataRoomApp({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  // Close popup window if this is an OAuth callback (?gdrive_connected=true)
  useEffect(() => {
    if (
      typeof window !== "undefined" &&
      window.opener &&
      window.location.search.includes("gdrive_connected=true")
    ) {
      window.close();
    }
  }, []);

  // Derive path segments from pathname instead of useParams (layout doesn't get [[...path]] params)
  const pathSegments = pathname
    .replace(/^\/dataroom\/?/, "")
    .split("/")
    .filter(Boolean);

  const {
    isSidebarCollapsed,
    toggleSidebar,
    favoriteIds,
    toggleFavorite,
    viewerFile,
    viewMode,
    setViewMode,
  } = useUIStore();
  const user = useAuthStore((state) => state.user);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const uploadInputRef = useRef<HTMLInputElement | null>(null);
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [creatingFolderId, setCreatingFolderId] = useState<string | null>(null);
  const [driveModalOpen, setDriveModalOpen] = useState(false);
  const [shareTarget, setShareTarget] = useState<{
    type: "file" | "folder";
    id: string;
    name: string;
  } | null>(null);
  // Pending move that has a name conflict — waits for user confirmation
  type PendingMove =
    | {
        kind: "folder";
        id: string;
        targetFolderId: string | null;
        conflictName: string;
      }
    | {
        kind: "files";
        ids: string[];
        targetFolderId: string | null;
        conflictNames: string[];
      };
  const [pendingMove, setPendingMove] = useState<PendingMove | null>(null);
  const [sortField, setSortField] = useState<"name" | "size" | "updatedAt">(
    "name",
  );
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [filterTypes, setFilterTypes] = useState<Set<FileType | "folder">>(
    new Set(),
  );

  const {
    folders,
    currentFolderId,
    loadFolders,
    createFolder,
    renameFolder,
    deleteFolder,
    moveFolder,
    setCurrentFolderId,
  } = useFolders();

  const navigate = useFolderNavigation(folders);

  // Sync URL path → currentFolderId.
  const foldersRef = useRef(folders);
  useEffect(() => {
    foldersRef.current = folders;
  }, [folders]);
  const foldersLoaded = folders.length > 0;

  useEffect(() => {
    if (!foldersLoaded) return;
    const { folderId, found } = resolveFolderPath(
      pathSegments,
      foldersRef.current,
    );
    if (!found) {
      router.replace("/dataroom");
      return;
    }
    if (folderId !== currentFolderId) {
      setCurrentFolderId(folderId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [foldersLoaded, pathSegments.join("/")]);

  const {
    toggleSelection,
    selectAll,
    clearSelection,
    selectedIds,
    removeFile,
    allFiles,
    setAllFiles,
    updateAllFile,
  } = useFileStore();

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

  const allFilesLoadingRef = useRef(false);
  const loadAllFiles = useCallback(async () => {
    if (!user) return;
    if (allFilesLoadingRef.current) return;
    allFilesLoadingRef.current = true;
    try {
      const data = await fileService.getFilesByOwner(user.uid);
      setAllFiles(data);
    } finally {
      allFilesLoadingRef.current = false;
    }
  }, [user, setAllFiles]);

  const loadAllFilesRef = useRef(loadAllFiles);
  useEffect(() => {
    loadAllFilesRef.current = loadAllFiles;
  }, [loadAllFiles]);

  const folderIdsKey = folders.map((f) => f.id).join(",");
  useEffect(() => {
    void loadAllFilesRef.current();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [folderIdsKey]);

  const handleUploadFiles = useCallback(
    async (browserFiles: File[]) => {
      // Deduplicate names against existing files in the current folder.
      // Also handle duplicates within the batch itself (e.g. uploading two "a.txt").
      const takenNames = files.map((f) => f.name);
      const renamedFiles = browserFiles.map((f) => {
        const name = uniqueName(f.name, takenNames);
        takenNames.push(name);
        return name === f.name ? f : new File([f], name, { type: f.type });
      });
      invalidateFolderCache(currentFolderId);
      await uploadFiles(renamedFiles);
      void loadAllFiles();
    },
    [uploadFiles, loadAllFiles, currentFolderId, files],
  );

  const handleCreateFolder = useCallback(
    async (name: string, parentId: string | null = null) => {
      const siblings = folders
        .filter((f) => f.parentId === parentId)
        .map((f) => f.name);
      const resolvedName = uniqueName(name, siblings);
      const folder = await createFolder(resolvedName, parentId);
      if (folder) setCreatingFolderId(folder.id);
      return folder;
    },
    [createFolder, folders],
  );

  const handleDeleteFile = useCallback(
    async (id: string) => {
      invalidateFolderCache(currentFolderId);
      await deleteFile(id);
      void loadAllFiles();
    },
    [deleteFile, loadAllFiles, currentFolderId],
  );

  const handleDeleteSelected = useCallback(async () => {
    invalidateFolderCache(currentFolderId);
    await deleteSelected();
    void loadAllFiles();
  }, [deleteSelected, loadAllFiles, currentFolderId]);

  const navigateUp = useCallback(() => {
    const current = folders.find((f) => f.id === currentFolderId);
    navigate(current?.parentId ?? null);
  }, [folders, currentFolderId, navigate]);

  const breadcrumbPath = buildBreadcrumb(folders, currentFolderId);

  const displayedFiles = useMemo(() => {
    const fileTypeFilters = [...filterTypes].filter(
      (t) => t !== "folder",
    ) as FileType[];
    let result =
      fileTypeFilters.length > 0
        ? files.filter((f) => fileTypeFilters.includes(f.type))
        : filterTypes.has("folder") && filterTypes.size === 1
          ? []
          : files;
    result = [...result].sort((a, b) => {
      let cmp = 0;
      if (sortField === "name") cmp = a.name.localeCompare(b.name);
      else if (sortField === "size") cmp = a.size - b.size;
      else
        cmp = new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
      return sortDir === "asc" ? cmp : -cmp;
    });
    return result;
  }, [files, filterTypes, sortField, sortDir]);

  const displayedFolders = useMemo(() => {
    const children = folders.filter((f) => f.parentId === currentFolderId);
    const hideFolders = filterTypes.size > 0 && !filterTypes.has("folder");
    if (hideFolders) return [];
    return [...children].sort((a, b) => {
      if (sortField === "name")
        return sortDir === "asc"
          ? a.name.localeCompare(b.name)
          : b.name.localeCompare(a.name);
      if (sortField === "size")
        return sortDir === "asc"
          ? a.name.localeCompare(b.name)
          : b.name.localeCompare(a.name);
      const cmp =
        new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [folders, currentFolderId, sortField, sortDir, filterTypes]);

  useGlobalHotkeys({
    onUpload: () => uploadInputRef.current?.click(),
    onCreateFolder: () => void handleCreateFolder("New Folder", currentFolderId),
    onDeleteSelected: handleDeleteSelected,
    onSelectAll: () => selectAll(displayedFolders.map((f) => f.id)),
    onNavigateUp: navigateUp,
    onImportFromDrive: () => setDriveModalOpen(true),
    searchInputRef,
  });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  );

  const collisionDetection: CollisionDetection = useCallback((args) => {
    const pointerHits = pointerWithin(args);
    if (pointerHits.length > 0) return pointerHits;
    return rectIntersection(args);
  }, []);

  function handleDragStart(event: DragStartEvent) {
    const id = (event.active.id as string).replace(/^main-/, "");
    setActiveDragId(id);
    // If dragging an item that is NOT part of the current selection, deselect all
    // so only the dragged item moves. If it IS selected, keep selection intact
    // (all selected items will move together in handleDragEnd).
    if (!selectedIds.has(id)) {
      clearSelection();
    }
  }

  function handleDragCancel() {
    setActiveDragId(null);
  }

  async function executePendingMove() {
    if (!pendingMove) return;
    setPendingMove(null);

    if (pendingMove.kind === "folder") {
      const { id, targetFolderId } = pendingMove;
      const folder = folders.find((f) => f.id === id)!;
      const siblings = folders
        .filter((f) => f.parentId === targetFolderId)
        .map((f) => f.name);
      const resolvedName = uniqueName(folder.name, siblings);
      // Rename first, then move. moveFolder does an optimistic update using its
      // captured `folders` closure which still has the old name — calling
      // loadFolders() after both operations ensures the store reflects both changes.
      if (resolvedName !== folder.name) await renameFolder(id, resolvedName);
      await moveFolder(id, targetFolderId);
      await loadFolders();
    } else {
      const { ids, targetFolderId } = pendingMove;
      const targetFileNames = allFiles
        .filter((f) => f.folderId === targetFolderId)
        .map((f) => f.name);
      const takenNames = [...targetFileNames];
      for (const id of ids) {
        const file = allFiles.find((f) => f.id === id);
        if (!file) continue;
        const resolvedName = uniqueName(file.name, takenNames);
        takenNames.push(resolvedName);
        if (resolvedName !== file.name) await renameFile(id, resolvedName);
        invalidateFolderCache(file.folderId);
        removeFile(id);
        updateAllFile({
          ...file,
          name: resolvedName,
          folderId: targetFolderId,
        });
        await moveFile(id, targetFolderId);
      }
      invalidateFolderCache(targetFolderId);
      if (targetFolderId === currentFolderId) loadFiles();
    }
  }

  async function handleDragEnd(event: DragEndEvent) {
    setActiveDragId(null);
    const { active, over } = event;
    if (!over) return;

    const rawActiveId = (active.id as string).replace(/^main-/, "");
    const overId = over.id as string;

    let targetFolderId: string | null;
    if (overId === "main-panel") {
      targetFolderId =
        (over.data.current as { folderId: string | null } | undefined)
          ?.folderId ?? null;
    } else if (
      overId === "folder-root" ||
      overId === "folder-root-bottom" ||
      overId.startsWith("file-root-") ||
      overId === "breadcrumb-root"
    ) {
      targetFolderId = null;
    } else if (overId.startsWith("main-folder-")) {
      targetFolderId = overId.replace("main-folder-", "");
    } else if (overId.startsWith("breadcrumb-folder-")) {
      targetFolderId = overId.replace("breadcrumb-folder-", "");
    } else if (overId.startsWith("folder-")) {
      targetFolderId = overId.replace("folder-", "");
    } else {
      return;
    }

    const activeId = rawActiveId;
    const isFolder = folders.some((f) => f.id === activeId);

    if (isFolder) {
      // Folders always move individually
      if (
        targetFolderId === activeId ||
        isFolderDescendant(activeId, targetFolderId, folders)
      )
        return;
      const folder = folders.find((f) => f.id === activeId)!;
      const siblings = folders
        .filter((f) => f.parentId === targetFolderId)
        .map((f) => f.name);
      if (siblings.some((n) => n.toLowerCase() === folder.name.toLowerCase())) {
        setPendingMove({
          kind: "folder",
          id: activeId,
          targetFolderId,
          conflictName: folder.name,
        });
        return;
      }
      moveFolder(activeId, targetFolderId);
    } else {
      // Determine which file IDs to move: if the dragged file is in the selection,
      // move all selected files; otherwise move only the dragged file.
      const idsToMove =
        selectedIds.has(activeId) && selectedIds.size > 1
          ? Array.from(selectedIds).filter((id) =>
              allFiles.some((f) => f.id === id),
            )
          : [activeId];

      const targetFileNames = allFiles
        .filter((f) => f.folderId === targetFolderId)
        .map((f) => f.name);
      const filesToMove = idsToMove
        .map((id) => allFiles.find((f) => f.id === id))
        .filter(Boolean) as typeof allFiles;
      const movingFiles = filesToMove.filter(
        (f) => f.folderId !== targetFolderId,
      );
      const conflictNames = movingFiles
        .map((f) => f.name)
        .filter((name) =>
          targetFileNames.some((n) => n.toLowerCase() === name.toLowerCase()),
        );

      if (conflictNames.length > 0) {
        setPendingMove({
          kind: "files",
          ids: movingFiles.map((f) => f.id),
          targetFolderId,
          conflictNames,
        });
        return;
      }

      for (const file of movingFiles) {
        invalidateFolderCache(file.folderId);
        removeFile(file.id);
        updateAllFile({ ...file, folderId: targetFolderId });
        await moveFile(file.id, targetFolderId);
      }
      invalidateFolderCache(targetFolderId);
      if (targetFolderId === currentFolderId) loadFiles();
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
        <div
          className={cn(
            "w-[22.5rem] flex-shrink-0 overflow-hidden transition-[margin] duration-300 ease-out",
            isSidebarCollapsed ? "-ml-[22.5rem]" : "ml-0",
          )}
        >
          <Sidebar
            folders={folders}
            currentFolderId={currentFolderId}
            onNavigate={navigate}
            onCreateFolder={handleCreateFolder}
            onRenameFolder={renameFolder}
            onDeleteFolder={async (id) => {
              invalidateAllFolderCache();
              await deleteFolder(id);
            }}
            user={user}
            files={allFiles}
            onUploadFiles={handleUploadFiles}
            onOpenFile={openFile}
            onSignOut={handleSignOut}
            isDragging={activeDragId !== null}
            favoriteIds={favoriteIds}
            activeFileId={viewerFile?.id ?? null}
            onImportFromDrive={() => setDriveModalOpen(true)}
          />
        </div>

        <div className="flex flex-1 flex-col overflow-hidden">
          <header className="flex items-center gap-3 border-b bg-background px-6 py-2.5">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0"
              onClick={toggleSidebar}
              title="Toggle sidebar (Ctrl+B)"
            >
              {isSidebarCollapsed ? (
                <PanelLeftOpen size={15} />
              ) : (
                <PanelLeftClose size={15} />
              )}
            </Button>
            <div className="h-5 w-px shrink-0 bg-border/100" />
            <Breadcrumb path={breadcrumbPath} onNavigate={navigate} />
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
                  onClick={handleDeleteSelected}
                  title="Delete selected (Del)"
                >
                  <Trash2 size={13} />
                  Delete
                  <KbdShortcut keys={['delete']} />
                </Button>
              </div>
            )}
            <DropdownMenu modal={false}>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 gap-1.5 text-muted-foreground"
                >
                  <ArrowUpDown size={13} />
                  Sort
                  {sortDir === "asc" ? (
                    <ArrowUp size={11} />
                  ) : (
                    <ArrowDown size={11} />
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40">
                <DropdownMenuLabel className="text-xs text-muted-foreground">
                  Sort by
                </DropdownMenuLabel>
                {(["name", "size", "updatedAt"] as const).map((field) => (
                  <DropdownMenuItem
                    key={field}
                    onClick={() => {
                      if (sortField === field)
                        setSortDir((d) => (d === "asc" ? "desc" : "asc"));
                      else {
                        setSortField(field);
                        setSortDir("asc");
                      }
                    }}
                    className="flex items-center justify-between"
                  >
                    <span>
                      {{ name: "Name", size: "Size", updatedAt: "Date" }[field]}
                    </span>
                    {sortField === field &&
                      (sortDir === "asc" ? (
                        <ArrowUp size={12} />
                      ) : (
                        <ArrowDown size={12} />
                      ))}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu modal={false}>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className={cn(
                    "h-8 gap-1.5",
                    filterTypes.size > 0
                      ? "border-primary text-primary"
                      : "text-muted-foreground",
                  )}
                >
                  <ListFilter size={13} />
                  Filter
                  {filterTypes.size > 0 && (
                    <span className="flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-medium text-primary-foreground">
                      {filterTypes.size}
                    </span>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                <DropdownMenuLabel className="text-xs text-muted-foreground">
                  Show
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {(
                  [
                    "folder",
                    "pdf",
                    "image",
                    "video",
                    "text",
                    "md",
                    "other",
                  ] as (FileType | "folder")[]
                ).map((type) => (
                  <DropdownMenuItem
                    key={type}
                    onSelect={(e) => {
                      e.preventDefault();
                      setFilterTypes((prev) => {
                        const next = new Set(prev);
                        next.has(type) ? next.delete(type) : next.add(type);
                        return next;
                      });
                    }}
                    className="flex items-center gap-2"
                  >
                    <Checkbox
                      checked={filterTypes.has(type)}
                      className="pointer-events-none"
                    />
                    <span className="capitalize">
                      {type === "folder" ? "Folders" : type}
                    </span>
                  </DropdownMenuItem>
                ))}
                {filterTypes.size > 0 && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => setFilterTypes(new Set())}
                      className="text-muted-foreground"
                    >
                      Clear filters
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            <div className="flex items-center rounded-lg border border-border/60 p-0.5">
              <Button
                variant="ghost"
                size="icon"
                className={cn("h-7 w-7", viewMode === "list" && "bg-accent")}
                onClick={() => setViewMode("list")}
                title="List view"
              >
                <List size={14} />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className={cn("h-7 w-7", viewMode === "grid" && "bg-accent")}
                onClick={() => setViewMode("grid")}
                title="Grid view"
              >
                <LayoutGrid size={14} />
              </Button>
            </div>
            <SearchBar ref={searchInputRef} />
            <ThemeToggle />
          </header>

          <main className="relative flex-1 overflow-hidden">
            <MainPanel
              files={displayedFiles}
              folders={folders}
              childFolders={displayedFolders}
              allFiles={allFiles}
              currentFolderId={currentFolderId}
              activeDragId={activeDragId}
              selectedIds={selectedIds}
              isLoading={filesLoading}
              breadcrumbPath={breadcrumbPath}
              onNavigate={navigate}
              onOpenFile={openFile}
              onRenameFile={renameFile}
              onDeleteFile={handleDeleteFile}
              onDeleteSelected={handleDeleteSelected}
              onUpload={handleUploadFiles}
              onFolderOpen={navigate}
              onFolderRename={(id, name) => renameFolder(id, name)}
              onFolderDelete={async (id) => {
                invalidateAllFolderCache();
                await deleteFolder(id);
              }}
              onFolderCreate={handleCreateFolder}
              onToggleSelect={toggleSelection}
              onSelectAll={selectAll}
              onClearSelection={clearSelection}
              favoriteIds={favoriteIds}
              onToggleFavorite={toggleFavorite}
              viewMode={viewMode}
              onShareFile={(id) => {
                const file = allFiles.find((f) => f.id === id);
                if (file) setShareTarget({ type: "file", id, name: file.name });
              }}
              creatingFolderId={creatingFolderId}
              onCreatingFolderEnd={() => setCreatingFolderId(null)}
              onShareFolder={(id) => {
                const folder = folders.find((f) => f.id === id);
                if (folder)
                  setShareTarget({ type: "folder", id, name: folder.name });
              }}
            />
          </main>
        </div>
      </div>

      <DragOverlay dropAnimation={null} zIndex={1200}>
        {draggedFolder && (
          <div className="pointer-events-none flex items-center gap-2 text-base text-foreground">
            <FileIcon
              type={draggedFolderHasContent ? "folder-filled" : "folder"}
              size={18}
            />
            <span className="max-w-[22rem] truncate">{draggedFolder.name}</span>
          </div>
        )}
        {draggedFile && (
          <div className="pointer-events-none flex items-center gap-2 text-base text-foreground">
            <FileIcon type={draggedFile.type} size={18} />
            <span className="max-w-[22rem] truncate">{draggedFile.name}</span>
          </div>
        )}
      </DragOverlay>

      {/* Hidden upload input for Ctrl+U hotkey */}
      <input
        ref={uploadInputRef}
        type="file"
        multiple
        className="sr-only"
        onChange={(e) => {
          if (e.target.files?.length) {
            void handleUploadFiles(Array.from(e.target.files));
            e.target.value = "";
          }
        }}
      />

      <ViewerModal />
      <UploadProgressPanel />
      {shareTarget && (
        <ShareModal
          resourceType={shareTarget.type}
          resourceId={shareTarget.id}
          resourceName={shareTarget.name}
          onClose={() => setShareTarget(null)}
        />
      )}
      {pendingMove && (
        <Dialog
          open
          onOpenChange={(open) => {
            if (!open) setPendingMove(null);
          }}
        >
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Name conflict</DialogTitle>
              <DialogDescription>
                {pendingMove.kind === "folder" ? (
                  <>
                    Folder{" "}
                    <strong>&ldquo;{pendingMove.conflictName}&rdquo;</strong>{" "}
                    already exists in the destination. Move anyway and rename it
                    automatically?
                  </>
                ) : (
                  <>
                    {pendingMove.conflictNames.length === 1 ? (
                      <>
                        <strong>
                          &ldquo;{pendingMove.conflictNames[0]}&rdquo;
                        </strong>{" "}
                        already exists in the destination.
                      </>
                    ) : (
                      <>
                        <strong>
                          {pendingMove.conflictNames.length} items
                        </strong>{" "}
                        already exist in the destination (
                        {pendingMove.conflictNames.join(", ")}).
                      </>
                    )}{" "}
                    Move anyway and rename automatically?
                  </>
                )}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-3 sm:justify-center">
              <Button variant="outline" className="w-36" onClick={() => setPendingMove(null)}>
                Cancel
              </Button>
              <Button className="w-36" onClick={() => void executePendingMove()}>
                Move and rename
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
      {driveModalOpen && (
        <GoogleDriveModal
          currentFolderId={currentFolderId}
          onImported={() => {
            invalidateFolderCache(currentFolderId);
            void loadFiles();
            void loadAllFiles();
          }}
          onClose={() => setDriveModalOpen(false)}
        />
      )}
    </DndContext>
  );
}

export default function DataRoomLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard>
      <DataRoomApp>{children}</DataRoomApp>
    </AuthGuard>
  );
}
