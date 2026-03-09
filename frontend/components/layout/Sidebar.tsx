"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronRight,
  ChevronDown,
  FolderPlus,
  Trash2,
  Pencil,
  Check,
  X,
  LogOut,
  Upload,
  HardDriveDownload,
} from "lucide-react";
import { useDraggable, useDroppable } from "@dnd-kit/core";
import { motion, AnimatePresence } from "framer-motion";
import { CSS } from "@dnd-kit/utilities";
import { Folder } from "@/types/folder.types";
import { AuthUser } from "@/types/auth.types";
import { FileMetadata } from "@/types/file.types";
import { FileIcon } from "@/components/common/FileIcon";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface SidebarProps {
  folders: Folder[];
  currentFolderId: string | null;
  onNavigate: (id: string | null) => void;
  onCreateFolder: (name: string, parentId: string | null) => void;
  onRenameFolder: (id: string, name: string) => void;
  onDeleteFolder: (id: string) => void;
  user: AuthUser | null;
  files: FileMetadata[];
  onUploadFiles: (files: File[]) => void;
  onOpenFile: (id: string) => void;
  onSignOut: () => void;
  isDragging?: boolean;
  favoriteIds: Set<string>;
  activeFileId?: string | null;
  onImportFromDrive?: () => void;
}

interface FolderNodeProps {
  folder: Folder;
  childFoldersByParentId: Map<string | null, Folder[]>;
  filesByFolderId: Map<string, FileMetadata[]>;
  currentFolderId: string | null;
  activeFileId: string | null;
  depth: number;
  onNavigate: (id: string | null) => void;
  onCreateFolder: (name: string, parentId: string | null) => void;
  onRenameFolder: (id: string, name: string) => void;
  onDeleteFolder: (id: string) => void;
  onOpenFile: (id: string) => void;
}

function SidebarFileNode({
  file,
  depth,
  isRootFile = false,
  isActive = false,
  onOpenFile,
}: {
  file: FileMetadata;
  depth: number;
  isRootFile?: boolean;
  isActive?: boolean;
  onOpenFile: (id: string) => void;
}) {
  const {
    setNodeRef: setDraggableRef,
    attributes,
    listeners,
    transform,
    isDragging,
  } = useDraggable({
    id: file.id,
  });
  // Root files act as a drop target for "move to root"
  const { setNodeRef: setDroppableRef, isOver } = useDroppable({
    id: `file-root-${file.id}`,
    disabled: !isRootFile,
  });

  const setNodeRef = useCallback(
    (node: HTMLElement | null) => {
      setDraggableRef(node);
      setDroppableRef(node);
    },
    [setDraggableRef, setDroppableRef],
  );

  return (
    <button
      ref={setNodeRef}
      className={cn(
        "flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-base transition-[color,background-color] duration-150 hover:bg-accent",
        "text-foreground",
        isDragging && "relative z-[60] opacity-40",
        isOver && "bg-primary/20",
        isActive && "bg-primary/10 text-primary font-medium",
      )}
      style={{
        paddingLeft: `${depth * 12 + 28}px`,
        transform: isDragging ? undefined : CSS.Translate.toString(transform),
      }}
      onClick={() => onOpenFile(file.id)}
      {...attributes}
      {...listeners}
    >
      <FileIcon type={file.type} size={18} />
      <span className="truncate">{file.name}</span>
    </button>
  );
}

// Returns true if targetId is folder.id or a descendant of folder.id
function isFolderOrDescendant(
  folderId: string,
  targetId: string | null,
  childFoldersByParentId: Map<string | null, Folder[]>,
): boolean {
  if (!targetId) return false;
  if (folderId === targetId) return true;
  const children = childFoldersByParentId.get(folderId) ?? [];
  return children.some((c) =>
    isFolderOrDescendant(c.id, targetId, childFoldersByParentId),
  );
}

function FolderNode({
  folder,
  childFoldersByParentId,
  filesByFolderId,
  currentFolderId,
  activeFileId,
  depth,
  onNavigate,
  onCreateFolder,
  onRenameFolder,
  onDeleteFolder,
  onOpenFile,
}: FolderNodeProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [inputValue, setInputValue] = useState("");

  const children = childFoldersByParentId.get(folder.id) ?? [];
  const filesInFolder = filesByFolderId.get(folder.id) ?? [];
  const hasContent = children.length > 0 || filesInFolder.length > 0;
  const isActive = currentFolderId === folder.id;

  // Auto-expand when current folder or active file is inside this folder
  const containsCurrentFolder = isFolderOrDescendant(
    folder.id,
    currentFolderId,
    childFoldersByParentId,
  );
  const containsActiveFile = activeFileId
    ? filesInFolder.some((f) => f.id === activeFileId)
    : false;
  useEffect(() => {
    if (containsCurrentFolder || containsActiveFile) setIsExpanded(true);
  }, [containsCurrentFolder, containsActiveFile]);
  const expandTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Makes this folder a drop target for DnD file/folder moves
  const { setNodeRef: setDroppableRef, isOver } = useDroppable({
    id: `folder-${folder.id}`,
  });
  const {
    attributes,
    listeners,
    setNodeRef: setDraggableRef,
    isDragging,
    transform,
  } = useDraggable({
    id: folder.id,
  });

  const setNodeRef = useCallback(
    (node: HTMLElement | null) => {
      setDroppableRef(node);
      setDraggableRef(node);
    },
    [setDroppableRef, setDraggableRef],
  );

  useEffect(() => {
    // Don't auto-expand when dragging the folder itself over itself
    if (isOver && !isExpanded && !isDragging) {
      expandTimerRef.current = setTimeout(() => {
        setIsExpanded(true);
      }, 1000);
    }

    if ((!isOver || isDragging) && expandTimerRef.current) {
      clearTimeout(expandTimerRef.current);
      expandTimerRef.current = null;
    }

    return () => {
      if (expandTimerRef.current) {
        clearTimeout(expandTimerRef.current);
        expandTimerRef.current = null;
      }
    };
  }, [isOver, isExpanded, isDragging]);

  function handleRenameSubmit() {
    if (inputValue.trim()) {
      onRenameFolder(folder.id, inputValue.trim());
    }
    setIsRenaming(false);
    setInputValue("");
  }

  function handleCreateSubmit() {
    if (inputValue.trim()) {
      onCreateFolder(inputValue.trim(), folder.id);
    }
    setIsCreating(false);
    setInputValue("");
  }

  function handleKeyDown(e: React.KeyboardEvent, onSubmit: () => void) {
    if (e.key === "Enter") onSubmit();
    if (e.key === "Escape") {
      setIsRenaming(false);
      setIsCreating(false);
      setInputValue("");
    }
  }

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: isDragging ? undefined : CSS.Translate.toString(transform),
        opacity: isDragging ? 0.4 : undefined,
      }}
      className={cn(isDragging && "relative z-[60]")}
      {...attributes}
      {...listeners}
    >
      <div
        className={cn(
          "group flex items-center gap-1 rounded-md px-3 py-2 text-base transition-colors",
          isActive && "bg-primary/10 text-primary font-medium",
          !isActive && "hover:bg-accent cursor-pointer",
          isOver && "bg-primary/20",
          isDragging && "cursor-grabbing",
        )}
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
      >
        {/* Expand/collapse toggle */}
        <button
          onClick={() => setIsExpanded((v) => !v)}
          className="flex-shrink-0 p-0.5 text-muted-foreground hover:text-foreground"
        >
          {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
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
            <button onClick={handleRenameSubmit}>
              <Check size={12} className="text-primary" />
            </button>
            <button onClick={() => setIsRenaming(false)}>
              <X size={12} className="text-muted-foreground" />
            </button>
          </div>
        ) : (
          <>
            <button
              className="flex flex-1 items-center gap-2 overflow-hidden"
              onClick={() => onNavigate(folder.id)}
            >
              <FileIcon
                type={hasContent ? "folder-filled" : "folder"}
                size={18}
              />
              <span className="truncate">{folder.name}</span>
            </button>

            {/* Action buttons — visible on hover */}
            <div className="hidden items-center gap-0.5 group-hover:flex">
              <button
                onClick={() => {
                  setIsCreating(true);
                  setIsExpanded(true);
                  setInputValue("");
                }}
                className="rounded p-0.5 hover:text-primary"
                title="New folder"
              >
                <FolderPlus size={12} />
              </button>
              <button
                onClick={() => {
                  setIsRenaming(true);
                  setInputValue(folder.name);
                }}
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
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="ml-4 overflow-hidden border-l border-border/70"
          >
            {isCreating && (
              <div
                className="flex items-center gap-2 px-3 py-1.5"
                style={{ paddingLeft: `${(depth + 1) * 12 + 12}px` }}
              >
                <FileIcon type="folder" size={16} />
                <Input
                  autoFocus
                  placeholder="Folder name"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={(e) => handleKeyDown(e, handleCreateSubmit)}
                  className="h-6 text-xs"
                />
                <button onClick={handleCreateSubmit}>
                  <Check size={12} className="text-primary" />
                </button>
                <button onClick={() => setIsCreating(false)}>
                  <X size={12} className="text-muted-foreground" />
                </button>
              </div>
            )}
            <AnimatePresence initial={false}>
              {children.map((child) => (
                <FolderNode
                  key={child.id}
                  folder={child}
                  childFoldersByParentId={childFoldersByParentId}
                  filesByFolderId={filesByFolderId}
                  currentFolderId={currentFolderId}
                  activeFileId={activeFileId}
                  depth={depth + 1}
                  onNavigate={onNavigate}
                  onCreateFolder={onCreateFolder}
                  onRenameFolder={onRenameFolder}
                  onDeleteFolder={onDeleteFolder}
                  onOpenFile={onOpenFile}
                />
              ))}
            </AnimatePresence>
            {!isCreating &&
              children.length === 0 &&
              filesInFolder.length === 0 && (
                <div
                  className="px-3 py-1.5 text-sm italic text-muted-foreground"
                  style={{ paddingLeft: `${(depth + 1) * 12 + 32}px` }}
                >
                  Folder is empty
                </div>
              )}
            {filesInFolder.map((file) => (
              <SidebarFileNode
                key={file.id}
                file={file}
                depth={depth + 1}
                isActive={file.id === activeFileId}
                onOpenFile={onOpenFile}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function Sidebar({
  folders,
  currentFolderId,
  onNavigate,
  onCreateFolder,
  onRenameFolder,
  onDeleteFolder,
  user,
  files,
  onUploadFiles,
  onOpenFile,
  onSignOut,
  isDragging = false,
  favoriteIds,
  activeFileId = null,
  onImportFromDrive,
}: SidebarProps) {
  const [isCreatingRoot, setIsCreatingRoot] = useState(false);
  const [rootName, setRootName] = useState("");
  const [failedAvatarUrl, setFailedAvatarUrl] = useState<string | null>(null);
  const uploadInputRef = useRef<HTMLInputElement | null>(null);

  // Root is a drop target too
  const { setNodeRef: setRootRef, isOver: isRootOver } = useDroppable({
    id: "folder-root",
  });

  // Bottom root drop zone
  const { setNodeRef: setRootBottomRef, isOver: isRootBottomOver } =
    useDroppable({
      id: "folder-root-bottom",
    });

  const childFoldersByParentId = useMemo(() => {
    const map = new Map<string | null, Folder[]>();
    for (const folder of folders) {
      const siblingList = map.get(folder.parentId) ?? [];
      siblingList.push(folder);
      map.set(folder.parentId, siblingList);
    }
    for (const [key, list] of map) {
      map.set(
        key,
        list.slice().sort((a, b) => a.name.localeCompare(b.name)),
      );
    }
    return map;
  }, [folders]);

  const filesByFolderId = useMemo(() => {
    const map = new Map<string, FileMetadata[]>();
    for (const file of files) {
      if (!file.folderId) continue;
      const bucket = map.get(file.folderId) ?? [];
      bucket.push(file);
      map.set(file.folderId, bucket);
    }
    return map;
  }, [files]);

  const rootFiles = useMemo(() => files.filter((f) => !f.folderId), [files]);

  const rootFolders = childFoldersByParentId.get(null) ?? [];

  const favoriteFiles = useMemo(
    () => files.filter((f) => favoriteIds.has(f.id)),
    [files, favoriteIds],
  );
  const favoriteFolders = useMemo(
    () => folders.filter((f) => favoriteIds.has(f.id)),
    [folders, favoriteIds],
  );
  const normalizedOwnerName =
    user?.displayName?.trim() || user?.email?.split("@")[0]?.trim();
  const roomLabel = `${normalizedOwnerName || "My"}'s room`;
  const userName = user?.displayName?.trim() || normalizedOwnerName || "User";
  const userEmail = user?.email || "";
  const userInitial = userName.charAt(0).toUpperCase();

  function handleRootCreate() {
    if (rootName.trim()) {
      onCreateFolder(rootName.trim(), null);
    }
    setIsCreatingRoot(false);
    setRootName("");
  }

  function handleUploadChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (!e.target.files?.length) return;
    onUploadFiles(Array.from(e.target.files));
    e.target.value = "";
  }

  return (
    <aside
      className="relative flex h-full flex-col bg-muted/30"
      style={{
        borderRight: "1px solid transparent",
        borderImage:
          "linear-gradient(to bottom, rgba(34,197,94,0.35) 0%, rgba(128,128,128,0.12) 100%) 1",
      }}
    >
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(circle at top left, rgba(34,197,94,0.2) 0%, transparent 45%)",
          backgroundImage: [
            "radial-gradient(circle at top left, rgba(34,197,94,0.2) 0%, transparent 45%)",
            "radial-gradient(circle, rgba(34,197,94,0.12) 1px, transparent 1px)",
          ].join(", "),
          backgroundSize: "100% 100%, 20px 20px",
          maskImage:
            "radial-gradient(circle at top left, black 0%, transparent 50%)",
          WebkitMaskImage:
            "radial-gradient(circle at top left, black 0%, transparent 50%)",
        }}
      />
      {/* Logo */}
      <div className="relative flex items-center px-5 py-4">
        <span className="relative font-[family-name:var(--font-space-grotesk)] text-2xl font-bold tracking-tight text-primary">
          <span className="relative">Data Room</span>
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-8 overflow-hidden px-5 pb-4">
        {/* Quick actions */}
        <div>
          <span className="text-sm font-medium tracking-wide text-muted-foreground">
            Add files
          </span>
          <div className="mt-3 flex gap-2">
            <input
              ref={uploadInputRef}
              type="file"
              multiple
              className="sr-only"
              onChange={handleUploadChange}
            />
            <Button
              variant="outline"
              className="flex h-16 flex-1 flex-col items-center justify-center gap-1.5 rounded-xl px-2 backdrop-blur-md"
              onClick={() => uploadInputRef.current?.click()}
              title="Upload files (Ctrl+U)"
            >
              <Upload size={16} />
              <span className="text-[11px] font-medium leading-none">
                Upload
              </span>
            </Button>
            {onImportFromDrive && (
              <Button
                variant="outline"
                className="flex h-16 flex-1 flex-col items-center justify-center gap-1.5 rounded-xl px-2 backdrop-blur-md"
                onClick={onImportFromDrive}
                title="Import from Google Drive (Ctrl+Shift+G)"
              >
                <HardDriveDownload size={16} />
                <span className="text-[11px] font-medium leading-none">
                  Import
                </span>
              </Button>
            )}
          </div>
        </div>

        {/* Favorites */}
        <div>
          <span className="text-sm font-medium tracking-wide text-muted-foreground">
            Favorites
          </span>
          <div className="mt-2">
            {favoriteFiles.length === 0 && favoriteFolders.length === 0 ? (
              <p className="px-1 py-2 text-xs text-muted-foreground/60">
                No favorites yet
              </p>
            ) : (
              <>
                {favoriteFolders.map((folder) => (
                  <button
                    key={folder.id}
                    className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-base transition-colors hover:bg-accent"
                    onClick={() => onNavigate(folder.id)}
                  >
                    <FileIcon type="folder-filled" size={18} />
                    <span className="truncate">{folder.name}</span>
                  </button>
                ))}
                {favoriteFiles.map((file) => (
                  <button
                    key={file.id}
                    className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-base transition-colors hover:bg-accent"
                    onClick={() => onOpenFile(file.id)}
                  >
                    <FileIcon type={file.type} size={18} />
                    <span className="truncate">{file.name}</span>
                  </button>
                ))}
              </>
            )}
          </div>
        </div>

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          {/* Fixed header: room label + new folder button */}
          <div className="flex shrink-0 items-center justify-between pb-2">
            <button
              ref={setRootRef}
              className={cn(
                "rounded-md px-1 py-1 text-left text-sm font-medium tracking-wide text-muted-foreground transition-colors",
                "hover:text-foreground",
                isRootOver && "bg-accent/60",
              )}
              onClick={() => onNavigate(null)}
            >
              {roomLabel}
            </button>
            <button
              onClick={() => {
                setIsCreatingRoot(true);
                setRootName("");
              }}
              className="flex items-center gap-1 rounded p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              title="New folder (Ctrl+Shift+F)"
            >
              <FolderPlus size={14} />
            </button>
          </div>

          {isCreatingRoot && (
            <div className="mb-2 flex items-center gap-1 px-1 py-1">
              <FileIcon type="folder" size={14} />
              <Input
                autoFocus
                placeholder="Folder name"
                value={rootName}
                onChange={(e) => setRootName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleRootCreate();
                  if (e.key === "Escape") setIsCreatingRoot(false);
                }}
                className="h-6 text-xs"
              />
              <button onClick={handleRootCreate}>
                <Check size={12} className="text-primary" />
              </button>
              <button onClick={() => setIsCreatingRoot(false)}>
                <X size={12} className="text-muted-foreground" />
              </button>
            </div>
          )}

          {/* Scrollable tree */}
          <div className="flex-1 overflow-y-auto">
            {rootFolders.length === 0 &&
              rootFiles.length === 0 &&
              !isCreatingRoot && (
                <div className="px-1 py-16 text-center text-xs leading-relaxed text-muted-foreground/60">
                  <p>No content yet.</p>
                  <p>
                    <button
                      className="text-primary underline-offset-2 hover:underline"
                      onClick={() => uploadInputRef.current?.click()}
                    >
                      Upload
                    </button>{" "}
                    or{" "}
                    <button
                      className="text-primary underline-offset-2 hover:underline"
                      onClick={() => {
                        setIsCreatingRoot(true);
                        setRootName("");
                      }}
                    >
                      create a folder
                    </button>
                    .
                  </p>
                </div>
              )}

            {rootFolders.map((folder) => (
              <FolderNode
                key={folder.id}
                folder={folder}
                childFoldersByParentId={childFoldersByParentId}
                filesByFolderId={filesByFolderId}
                currentFolderId={currentFolderId}
                activeFileId={activeFileId}
                depth={0}
                onNavigate={onNavigate}
                onCreateFolder={onCreateFolder}
                onRenameFolder={onRenameFolder}
                onDeleteFolder={onDeleteFolder}
                onOpenFile={onOpenFile}
              />
            ))}
            {rootFiles.map((file) => (
              <SidebarFileNode
                key={file.id}
                file={file}
                depth={0}
                isRootFile
                isActive={file.id === activeFileId}
                onOpenFile={onOpenFile}
              />
            ))}
            {isDragging && (
              <div
                ref={setRootBottomRef}
                className={cn(
                  "mt-1 flex h-10 items-center justify-center rounded-md border border-dashed transition-colors",
                  isRootBottomOver
                    ? "border-primary/40 bg-primary/10 text-xs text-foreground"
                    : "border-border text-xs text-muted-foreground/50",
                )}
              >
                Move to root
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Sign out */}
      <div className="px-5 pb-4">
        <div className="rounded-xl border border-border/60 bg-background/80 p-3">
          <div className="flex items-center gap-3">
            {user?.photoURL && failedAvatarUrl !== user.photoURL ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={user.photoURL}
                alt={userName}
                className="h-9 w-9 rounded-full object-cover"
                referrerPolicy="no-referrer"
                onError={() => setFailedAvatarUrl(user.photoURL ?? null)}
              />
            ) : (
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/15 text-sm font-semibold text-primary">
                {userInitial}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-foreground">
                {userName}
              </p>
              {userEmail && (
                <p className="truncate text-xs text-muted-foreground">
                  {userEmail}
                </p>
              )}
            </div>
            <Button
              variant="ghost"
              className="h-9 shrink-0 rounded-lg px-2 text-sm text-muted-foreground hover:text-foreground"
              onClick={onSignOut}
            >
              Sign out
              <LogOut size={14} className="ml-2" />
            </Button>
          </div>
        </div>
      </div>
    </aside>
  );
}
