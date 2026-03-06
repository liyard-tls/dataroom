"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useDroppable, useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { motion, AnimatePresence } from "framer-motion";
import {
  Upload,
  Trash2,
  MoreHorizontal,
  FolderOpen,
  Pencil,
  Eye,
  Star,
} from "lucide-react";
import { FileMetadata } from "@/types/file.types";
import { Folder } from "@/types/folder.types";
import { FileIcon } from "@/components/common/FileIcon";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { formatFileSize, formatModifiedDate } from "@/lib/fileHelpers";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface MainPanelProps {
  files: FileMetadata[];
  folders: Folder[];
  childFolders: Folder[];
  allFiles: FileMetadata[];
  currentFolderId: string | null;
  activeDragId: string | null;
  selectedIds: Set<string>;
  isLoading: boolean;
  breadcrumbPath: Folder[];
  onNavigate: (id: string | null) => void;
  onOpenFile: (id: string) => void;
  onRenameFile: (id: string, name: string) => void;
  onDeleteFile: (id: string) => void;
  onDeleteSelected: () => void;
  onUpload: (files: File[]) => void;
  onFolderOpen: (id: string) => void;
  onFolderRename: (id: string, name: string) => void;
  onFolderDelete: (id: string) => void;
  onFolderCreate: (name: string, parentId: string | null) => void;
  onToggleSelect: (id: string) => void;
  onSelectAll: () => void;
  onClearSelection: () => void;
  favoriteIds: Set<string>;
  onToggleFavorite: (id: string) => void;
  viewMode: "list" | "grid";
}

// Shared column widths — identical in header and every row
const COL_NAME = "flex-1 min-w-0";
const COL_SIZE = "w-28 shrink-0 text-center";
const COL_DATE = "w-36 shrink-0 text-center";
// Actions column always takes up space so rows never shift when menu opens/closes
const COL_ACTIONS = "w-7 shrink-0";
const ROW_PX = "mx-4 px-4";

function stopRowPropagation(e: React.SyntheticEvent) {
  e.stopPropagation();
}

function EmptyState({ onUpload }: { onUpload: (files: File[]) => void }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 text-muted-foreground">
      <Upload size={40} className="opacity-30" />
      <p className="text-sm">Drop files here or click Upload</p>
      <label>
        <input
          type="file"
          multiple
          className="sr-only"
          onChange={(e) =>
            e.target.files && onUpload(Array.from(e.target.files))
          }
        />
        <Button variant="outline" className="cursor-pointer" asChild>
          <span>Upload files</span>
        </Button>
      </label>
    </div>
  );
}

function FolderRow({
  folder,
  isNotEmpty,
  isSelected,
  isFavorite,
  onSelect,
  onOpen,
  onRename,
  onDelete,
  onToggleFavorite,
}: {
  folder: Folder;
  isNotEmpty: boolean;
  isSelected: boolean;
  isFavorite: boolean;
  onSelect: () => void;
  onOpen: () => void;
  onRename: (name: string) => void;
  onDelete: () => void;
  onToggleFavorite: () => void;
}) {
  const [isRenaming, setIsRenaming] = useState(false);
  const [nameValue, setNameValue] = useState(folder.name);
  const expandTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { setNodeRef: setDropRef, isOver } = useDroppable({ id: `main-folder-${folder.id}` });
  const { setNodeRef: setDragRef, attributes, listeners, transform, isDragging } = useDraggable({ id: `main-${folder.id}` });
  const setNodeRef = useCallback((node: HTMLElement | null) => { setDropRef(node); setDragRef(node); }, [setDropRef, setDragRef]);

  // Auto-navigate into folder when hovering during DnD — but never for the folder being dragged itself
  useEffect(() => {
    if (isOver && !isDragging) {
      expandTimerRef.current = setTimeout(() => onOpen(), 1000);
    } else {
      if (expandTimerRef.current) { clearTimeout(expandTimerRef.current); expandTimerRef.current = null; }
    }
    return () => { if (expandTimerRef.current) clearTimeout(expandTimerRef.current); };
  }, [isOver, isDragging, onOpen]);

  function handleRenameSubmit() {
    const trimmed = nameValue.trim();
    if (trimmed && trimmed !== folder.name) onRename(trimmed);
    setIsRenaming(false);
  }

  return (
    <motion.div
      ref={setNodeRef}
      layout
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: isDragging ? 0.4 : 1, y: 0 }}
      exit={{ opacity: 0 }}
      style={{ transform: isDragging ? undefined : CSS.Translate.toString(transform) }}
      className={cn(
        "group flex items-center gap-3 rounded-lg py-2 transition-colors",
        ROW_PX,
        isSelected ? "bg-primary/10" : "hover:bg-accent",
        isOver && !isDragging && "bg-primary/15 ring-1 ring-inset ring-primary/30",
      )}
      onDoubleClick={onOpen}
    >
      <div
        className="flex w-6 shrink-0 items-center justify-center"
        onClick={stopRowPropagation}
        onPointerDown={stopRowPropagation}
        onDoubleClick={stopRowPropagation}
      >
        <Checkbox
          checked={isSelected}
          onCheckedChange={onSelect}
          className="opacity-100"
        />
      </div>

      <div
        className={cn("flex min-w-0 flex-1 cursor-grab items-center gap-2 overflow-hidden active:cursor-grabbing", COL_NAME)}
        {...attributes}
        {...listeners}
        onClick={stopRowPropagation}
        onDoubleClick={(e) => { e.stopPropagation(); onOpen(); }}
      >
        <span className="shrink-0">
          <FileIcon
            type={isNotEmpty ? "folder-filled" : "folder"}
            size={20}
          />
        </span>
        {isRenaming ? (
          <input
            autoFocus
            value={nameValue}
            onChange={(e) => setNameValue(e.target.value)}
            onBlur={handleRenameSubmit}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleRenameSubmit();
              if (e.key === "Escape") {
                setIsRenaming(false);
                setNameValue(folder.name);
              }
            }}
            className="flex-1 rounded border border-primary bg-background px-1 text-sm outline-none"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <span className="truncate text-sm">{folder.name}</span>
        )}
        <button
          onClick={(e) => { e.stopPropagation(); onToggleFavorite(); }}
          onPointerDown={(e) => e.stopPropagation()}
          onDoubleClick={(e) => e.stopPropagation()}
          className={cn(
            "ml-1 shrink-0 rounded p-0.5 transition-colors",
            isFavorite
              ? "text-yellow-400"
              : "text-transparent group-hover:text-muted-foreground/40 hover:!text-yellow-400",
          )}
        >
          <Star size={13} className={cn(isFavorite && "fill-yellow-400")} />
        </button>
      </div>

      <span className={cn("text-xs text-muted-foreground", COL_SIZE)}>—</span>
      <span className={cn("text-xs text-muted-foreground", COL_DATE)}>
        {formatModifiedDate(folder.updatedAt)}
      </span>

      <div className={COL_ACTIONS}>
        {/* modal=false prevents Radix from adding padding-right to body on open */}
        <DropdownMenu modal={false}>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={stopRowPropagation}
              onDoubleClick={stopRowPropagation}
            >
              <MoreHorizontal size={15} />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuItem onClick={onOpen}>
              <FolderOpen size={14} className="mr-2" /> Open
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => {
                setIsRenaming(true);
                setNameValue(folder.name);
              }}
            >
              <Pencil size={14} className="mr-2" /> Rename
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onToggleFavorite}>
              <Star size={14} className={cn("mr-2", isFavorite && "fill-yellow-400 text-yellow-400")} />
              {isFavorite ? "Remove from Favorites" : "Add to Favorites"}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={onDelete}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 size={14} className="mr-2" /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </motion.div>
  );
}

function FileRow({
  file,
  isSelected,
  isFavorite,
  onSelect,
  onOpen,
  onRename,
  onDelete,
  onToggleFavorite,
}: {
  file: FileMetadata;
  isSelected: boolean;
  isFavorite: boolean;
  onSelect: () => void;
  onOpen: () => void;
  onRename: (name: string) => void;
  onDelete: () => void;
  onToggleFavorite: () => void;
}) {
  const [isRenaming, setIsRenaming] = useState(false);
  const [nameValue, setNameValue] = useState(file.name);
  const { setNodeRef, attributes, listeners, transform, isDragging } = useDraggable({ id: `main-${file.id}` });

  function handleRenameSubmit() {
    const trimmed = nameValue.trim();
    if (trimmed && trimmed !== file.name) onRename(trimmed);
    setIsRenaming(false);
  }

  return (
    <motion.div
      ref={setNodeRef}
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: isDragging ? 0.4 : 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      style={{ transform: isDragging ? undefined : CSS.Translate.toString(transform) }}
      className={cn(
        "group flex items-center gap-3 rounded-lg py-2 transition-colors",
        ROW_PX,
        isSelected ? "bg-primary/10" : "hover:bg-accent",
      )}
      onDoubleClick={onOpen}
    >
      <div
        className="flex w-6 shrink-0 items-center justify-center"
        onClick={stopRowPropagation}
        onPointerDown={stopRowPropagation}
        onDoubleClick={stopRowPropagation}
      >
        <Checkbox
          checked={isSelected}
          onCheckedChange={onSelect}
          className="opacity-100"
        />
      </div>

      <div
        className={cn("flex min-w-0 flex-1 cursor-grab items-center gap-2 overflow-hidden active:cursor-grabbing", COL_NAME)}
        {...attributes}
        {...listeners}
        onClick={stopRowPropagation}
        onDoubleClick={(e) => { e.stopPropagation(); onOpen(); }}
      >
        <span className="shrink-0">
          <FileIcon type={file.type} size={18} />
        </span>
        {isRenaming ? (
          <input
            autoFocus
            value={nameValue}
            onChange={(e) => setNameValue(e.target.value)}
            onBlur={handleRenameSubmit}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleRenameSubmit();
              if (e.key === "Escape") {
                setIsRenaming(false);
                setNameValue(file.name);
              }
            }}
            className="flex-1 rounded border border-primary bg-background px-1 text-sm outline-none"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <span className="truncate text-sm">{file.name}</span>
        )}
        <button
          onClick={(e) => { e.stopPropagation(); onToggleFavorite(); }}
          onPointerDown={(e) => e.stopPropagation()}
          onDoubleClick={(e) => e.stopPropagation()}
          className={cn(
            "ml-1 shrink-0 rounded p-0.5 transition-colors",
            isFavorite
              ? "text-yellow-400"
              : "text-transparent group-hover:text-muted-foreground/40 hover:!text-yellow-400",
          )}
        >
          <Star size={13} className={cn(isFavorite && "fill-yellow-400")} />
        </button>
      </div>

      <span className={cn("text-xs text-muted-foreground", COL_SIZE)}>
        {formatFileSize(file.size)}
      </span>

      <span className={cn("text-xs text-muted-foreground", COL_DATE)}>
        {formatModifiedDate(file.updatedAt)}
      </span>

      <div className={COL_ACTIONS}>
        {/* modal=false prevents Radix from adding padding-right to body on open */}
        <DropdownMenu modal={false}>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={stopRowPropagation}
              onDoubleClick={stopRowPropagation}
            >
              <MoreHorizontal size={15} />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuItem onClick={onOpen}>
              <Eye size={14} className="mr-2" /> Open
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => {
                setIsRenaming(true);
                setNameValue(file.name);
              }}
            >
              <Pencil size={14} className="mr-2" /> Rename
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onToggleFavorite}>
              <Star size={14} className={cn("mr-2", isFavorite && "fill-yellow-400 text-yellow-400")} />
              {isFavorite ? "Remove from Favorites" : "Add to Favorites"}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={onDelete}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 size={14} className="mr-2" /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </motion.div>
  );
}

function FolderCard({
  folder,
  isNotEmpty,
  isSelected,
  isFavorite,
  onSelect,
  onOpen,
  onRename,
  onDelete,
  onToggleFavorite,
}: {
  folder: Folder;
  isNotEmpty: boolean;
  isSelected: boolean;
  isFavorite: boolean;
  onSelect: () => void;
  onOpen: () => void;
  onRename: (name: string) => void;
  onDelete: () => void;
  onToggleFavorite: () => void;
}) {
  const [isRenaming, setIsRenaming] = useState(false);
  const [nameValue, setNameValue] = useState(folder.name);
  const expandTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { setNodeRef: setDropRef, isOver } = useDroppable({ id: `main-folder-${folder.id}` });
  const { setNodeRef: setDragRef, attributes, listeners, transform, isDragging } = useDraggable({ id: `main-${folder.id}` });
  const setNodeRef = useCallback((node: HTMLElement | null) => { setDropRef(node); setDragRef(node); }, [setDropRef, setDragRef]);

  useEffect(() => {
    if (isOver && !isDragging) {
      expandTimerRef.current = setTimeout(() => onOpen(), 1000);
    } else {
      if (expandTimerRef.current) { clearTimeout(expandTimerRef.current); expandTimerRef.current = null; }
    }
    return () => { if (expandTimerRef.current) clearTimeout(expandTimerRef.current); };
  }, [isOver, isDragging, onOpen]);

  function handleRenameSubmit() {
    const trimmed = nameValue.trim();
    if (trimmed && trimmed !== folder.name) onRename(trimmed);
    setIsRenaming(false);
  }

  return (
    <motion.div
      ref={setNodeRef}
      layout
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: isDragging ? 0.4 : 1, scale: 1 }}
      exit={{ opacity: 0 }}
      style={{ transform: isDragging ? undefined : CSS.Translate.toString(transform) }}
      className={cn(
        "group relative flex flex-col gap-2 rounded-xl border p-3 transition-colors cursor-pointer",
        isSelected ? "border-primary/40 bg-primary/10" : "border-border/60 bg-card hover:border-border hover:bg-accent/50",
        isOver && !isDragging && "border-primary/40 bg-primary/10 ring-1 ring-inset ring-primary/30",
      )}
      onDoubleClick={onOpen}
    >
      {/* Checkbox */}
      <div
        className="absolute left-2 top-2 z-10"
        onClick={stopRowPropagation}
        onPointerDown={stopRowPropagation}
        onDoubleClick={stopRowPropagation}
      >
        <Checkbox checked={isSelected} onCheckedChange={onSelect} className="opacity-100" />
      </div>

      {/* Favorite + menu */}
      <div className="absolute right-2 top-2 z-10 flex items-center gap-1">
        <button
          onClick={(e) => { e.stopPropagation(); onToggleFavorite(); }}
          onPointerDown={(e) => e.stopPropagation()}
          className={cn(
            "rounded p-0.5 transition-colors",
            isFavorite ? "text-yellow-400" : "text-transparent group-hover:text-muted-foreground/40 hover:!text-yellow-400",
          )}
        >
          <Star size={13} className={cn(isFavorite && "fill-yellow-400")} />
        </button>
        <DropdownMenu modal={false}>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={stopRowPropagation} onDoubleClick={stopRowPropagation}>
              <MoreHorizontal size={13} />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuItem onClick={onOpen}><FolderOpen size={14} className="mr-2" /> Open</DropdownMenuItem>
            <DropdownMenuItem onClick={() => { setIsRenaming(true); setNameValue(folder.name); }}>
              <Pencil size={14} className="mr-2" /> Rename
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onToggleFavorite}>
              <Star size={14} className={cn("mr-2", isFavorite && "fill-yellow-400 text-yellow-400")} />
              {isFavorite ? "Remove from Favorites" : "Add to Favorites"}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onDelete} className="text-destructive focus:text-destructive">
              <Trash2 size={14} className="mr-2" /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Icon */}
      <div
        className="flex flex-1 cursor-grab items-center justify-center py-4 active:cursor-grabbing"
        {...attributes}
        {...listeners}
        onClick={stopRowPropagation}
        onDoubleClick={(e) => { e.stopPropagation(); onOpen(); }}
      >
        <FileIcon type={isNotEmpty ? "folder-filled" : "folder"} size={40} />
      </div>

      {/* Name */}
      <div className="px-1 pb-1">
        {isRenaming ? (
          <input
            autoFocus
            value={nameValue}
            onChange={(e) => setNameValue(e.target.value)}
            onBlur={handleRenameSubmit}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleRenameSubmit();
              if (e.key === "Escape") { setIsRenaming(false); setNameValue(folder.name); }
            }}
            className="w-full rounded border border-primary bg-background px-1 text-xs outline-none"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <p className="truncate text-center text-xs font-medium">{folder.name}</p>
        )}
        <p className="mt-0.5 text-center text-[10px] text-muted-foreground">{formatModifiedDate(folder.updatedAt)}</p>
      </div>
    </motion.div>
  );
}

function FileCard({
  file,
  isSelected,
  isFavorite,
  onSelect,
  onOpen,
  onRename,
  onDelete,
  onToggleFavorite,
}: {
  file: FileMetadata;
  isSelected: boolean;
  isFavorite: boolean;
  onSelect: () => void;
  onOpen: () => void;
  onRename: (name: string) => void;
  onDelete: () => void;
  onToggleFavorite: () => void;
}) {
  const [isRenaming, setIsRenaming] = useState(false);
  const [nameValue, setNameValue] = useState(file.name);
  const { setNodeRef, attributes, listeners, transform, isDragging } = useDraggable({ id: `main-${file.id}` });

  function handleRenameSubmit() {
    const trimmed = nameValue.trim();
    if (trimmed && trimmed !== file.name) onRename(trimmed);
    setIsRenaming(false);
  }

  return (
    <motion.div
      ref={setNodeRef}
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: isDragging ? 0.4 : 1, scale: 1 }}
      exit={{ opacity: 0 }}
      style={{ transform: isDragging ? undefined : CSS.Translate.toString(transform) }}
      className={cn(
        "group relative flex flex-col gap-2 rounded-xl border p-3 transition-colors cursor-pointer",
        isSelected ? "border-primary/40 bg-primary/10" : "border-border/60 bg-card hover:border-border hover:bg-accent/50",
      )}
      onDoubleClick={onOpen}
    >
      {/* Checkbox */}
      <div
        className="absolute left-2 top-2 z-10"
        onClick={stopRowPropagation}
        onPointerDown={stopRowPropagation}
        onDoubleClick={stopRowPropagation}
      >
        <Checkbox checked={isSelected} onCheckedChange={onSelect} className="opacity-100" />
      </div>

      {/* Favorite + menu */}
      <div className="absolute right-2 top-2 z-10 flex items-center gap-1">
        <button
          onClick={(e) => { e.stopPropagation(); onToggleFavorite(); }}
          onPointerDown={(e) => e.stopPropagation()}
          className={cn(
            "rounded p-0.5 transition-colors",
            isFavorite ? "text-yellow-400" : "text-transparent group-hover:text-muted-foreground/40 hover:!text-yellow-400",
          )}
        >
          <Star size={13} className={cn(isFavorite && "fill-yellow-400")} />
        </button>
        <DropdownMenu modal={false}>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={stopRowPropagation} onDoubleClick={stopRowPropagation}>
              <MoreHorizontal size={13} />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuItem onClick={onOpen}><Eye size={14} className="mr-2" /> Open</DropdownMenuItem>
            <DropdownMenuItem onClick={() => { setIsRenaming(true); setNameValue(file.name); }}>
              <Pencil size={14} className="mr-2" /> Rename
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onToggleFavorite}>
              <Star size={14} className={cn("mr-2", isFavorite && "fill-yellow-400 text-yellow-400")} />
              {isFavorite ? "Remove from Favorites" : "Add to Favorites"}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onDelete} className="text-destructive focus:text-destructive">
              <Trash2 size={14} className="mr-2" /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Icon */}
      <div
        className="flex flex-1 cursor-grab items-center justify-center py-4 active:cursor-grabbing"
        {...attributes}
        {...listeners}
        onClick={stopRowPropagation}
        onDoubleClick={(e) => { e.stopPropagation(); onOpen(); }}
      >
        <FileIcon type={file.type} size={40} />
      </div>

      {/* Name + size */}
      <div className="px-1 pb-1">
        {isRenaming ? (
          <input
            autoFocus
            value={nameValue}
            onChange={(e) => setNameValue(e.target.value)}
            onBlur={handleRenameSubmit}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleRenameSubmit();
              if (e.key === "Escape") { setIsRenaming(false); setNameValue(file.name); }
            }}
            className="w-full rounded border border-primary bg-background px-1 text-xs outline-none"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <p className="truncate text-center text-xs font-medium">{file.name}</p>
        )}
        <p className="mt-0.5 text-center text-[10px] text-muted-foreground">{formatFileSize(file.size)}</p>
      </div>
    </motion.div>
  );
}

export function MainPanel({
  files,
  folders,
  allFiles,
  currentFolderId,
  activeDragId,
  selectedIds,
  isLoading,
  breadcrumbPath: _breadcrumbPath,
  onNavigate: _onNavigate,
  onOpenFile,
  onRenameFile,
  onDeleteFile,
  onDeleteSelected: _onDeleteSelected,
  onUpload,
  onFolderOpen,
  onFolderRename,
  onFolderDelete,
  onFolderCreate: _onFolderCreate,
  onToggleSelect,
  onSelectAll: _onSelectAll,
  onClearSelection,
  favoriteIds,
  onToggleFavorite,
  viewMode,
  childFolders,
}: MainPanelProps) {
  const [isDragOver, setIsDragOver] = useState(false);

  const { setNodeRef, isOver: isDndOver } = useDroppable({
    id: "main-panel",
    data: { folderId: currentFolderId },
  });

  // Don't highlight if the dragged item already lives in this folder
  const draggedFile = activeDragId ? allFiles.find((f) => f.id === activeDragId) : null;
  const draggedFolder = activeDragId ? folders.find((f) => f.id === activeDragId) : null;
  const alreadyHere =
    (draggedFile && draggedFile.folderId === currentFolderId) ||
    (draggedFolder && draggedFolder.parentId === currentFolderId);
  const showDndHighlight = isDndOver && !alreadyHere;
  const isEmpty = files.length === 0 && childFolders.length === 0;

  const totalItems = files.length + childFolders.length;
  const allSelected = totalItems > 0 && selectedIds.size === totalItems;
  const someSelected = selectedIds.size > 0 && !allSelected;

  const handleDragOver = useCallback((e: React.DragEvent) => {
    if (e.dataTransfer.types.includes("Files")) {
      e.preventDefault();
      setIsDragOver(true);
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      if (e.dataTransfer.files.length > 0)
        onUpload(Array.from(e.dataTransfer.files));
    },
    [onUpload],
  );

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "relative flex h-full flex-col transition-colors",
        (isDragOver || showDndHighlight) && "bg-primary/5 ring-2 ring-inset ring-primary/30",
      )}
      onDragOver={handleDragOver}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={handleDrop}
    >
      {/* Column headers — list view only */}
      {viewMode === "list" && (
        <div
          className={cn(
            "flex items-center gap-3 border-b py-2.5 text-sm font-medium text-muted-foreground",
            ROW_PX,
          )}
        >
          <div
            className="flex w-6 shrink-0 items-center justify-center"
            onClick={stopRowPropagation}
            onPointerDown={stopRowPropagation}
          >
            <Checkbox
              checked={someSelected ? "indeterminate" : allSelected}
              onCheckedChange={() => {
                if (allSelected) {
                  onClearSelection();
                } else {
                  const allIds = [
                    ...files.map((f) => f.id),
                    ...childFolders.map((f) => f.id),
                  ];
                  allIds.forEach((id) => {
                    if (!selectedIds.has(id)) onToggleSelect(id);
                  });
                }
              }}
            />
          </div>
          <span className={COL_NAME}>Name</span>
          <span className={COL_SIZE}>Size</span>
          <span className={COL_DATE}>Modified</span>
          <span className={COL_ACTIONS} />
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto py-2">
        {isLoading && (
          <div className="flex h-32 items-center justify-center">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        )}

        {!isLoading && isEmpty && <EmptyState onUpload={onUpload} />}

        {!isLoading && !isEmpty && viewMode === "list" && (
          <>
            <AnimatePresence>
              {childFolders.map((folder) => (
                <FolderRow
                  key={folder.id}
                  folder={folder}
                  isNotEmpty={
                    folders.some(
                      (candidate) => candidate.parentId === folder.id,
                    ) || allFiles.some((file) => file.folderId === folder.id)
                  }
                  isSelected={selectedIds.has(folder.id)}
                  isFavorite={favoriteIds.has(folder.id)}
                  onSelect={() => onToggleSelect(folder.id)}
                  onOpen={() => onFolderOpen(folder.id)}
                  onRename={(name) => onFolderRename(folder.id, name)}
                  onDelete={() => onFolderDelete(folder.id)}
                  onToggleFavorite={() => onToggleFavorite(folder.id)}
                />
              ))}
            </AnimatePresence>

            <AnimatePresence>
              {files.map((file) => (
                <FileRow
                  key={file.id}
                  file={file}
                  isSelected={selectedIds.has(file.id)}
                  isFavorite={favoriteIds.has(file.id)}
                  onSelect={() => onToggleSelect(file.id)}
                  onOpen={() => onOpenFile(file.id)}
                  onRename={(name) => onRenameFile(file.id, name)}
                  onDelete={() => onDeleteFile(file.id)}
                  onToggleFavorite={() => onToggleFavorite(file.id)}
                />
              ))}
            </AnimatePresence>
          </>
        )}

        {!isLoading && !isEmpty && viewMode === "grid" && (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(140px,1fr))] gap-3 px-4 py-2">
            <AnimatePresence>
              {childFolders.map((folder) => (
                <FolderCard
                  key={folder.id}
                  folder={folder}
                  isNotEmpty={
                    folders.some((candidate) => candidate.parentId === folder.id) ||
                    allFiles.some((file) => file.folderId === folder.id)
                  }
                  isSelected={selectedIds.has(folder.id)}
                  isFavorite={favoriteIds.has(folder.id)}
                  onSelect={() => onToggleSelect(folder.id)}
                  onOpen={() => onFolderOpen(folder.id)}
                  onRename={(name) => onFolderRename(folder.id, name)}
                  onDelete={() => onFolderDelete(folder.id)}
                  onToggleFavorite={() => onToggleFavorite(folder.id)}
                />
              ))}
            </AnimatePresence>
            <AnimatePresence>
              {files.map((file) => (
                <FileCard
                  key={file.id}
                  file={file}
                  isSelected={selectedIds.has(file.id)}
                  isFavorite={favoriteIds.has(file.id)}
                  onSelect={() => onToggleSelect(file.id)}
                  onOpen={() => onOpenFile(file.id)}
                  onRename={(name) => onRenameFile(file.id, name)}
                  onDelete={() => onDeleteFile(file.id)}
                  onToggleFavorite={() => onToggleFavorite(file.id)}
                />
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {isDragOver && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="rounded-xl bg-background/90 px-6 py-3 text-sm font-medium shadow-lg ring-1 ring-primary">
            Drop files to upload
          </div>
        </div>
      )}
    </div>
  );
}
