"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useDroppable, useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import {
  Upload,
  Trash2,
  MoreHorizontal,
  FolderOpen,
  Pencil,
  Eye,
  Star,
  Link,
  Users,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
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
  onRangeSelect: (ids: string[]) => void;
  onSelectAll: () => void;
  sortField?: "name" | "size" | "updatedAt";
  sortDir?: "asc" | "desc";
  onSort?: (field: "name" | "size" | "updatedAt") => void;
  onClearSelection: () => void;
  favoriteIds: Set<string>;
  onToggleFavorite: (id: string) => void;
  sharedIds: Set<string>;
  viewMode: "list" | "grid";
  onShareFile: (id: string) => void;
  onShareFolder: (id: string) => void;
  creatingFolderId?: string | null;
  onCreatingFolderEnd?: () => void;
  // Set this to focus a specific item via keyboard (e.g. after search navigation)
  focusItemId?: string | null;
  onFocusItemConsumed?: () => void;
  // Ref forwarded to the scrollable content div for external focus control (e.g. arrow-key hotkeys)
  contentRef?: React.RefObject<HTMLDivElement | null>;
  // Ref that MainPanel writes its current moveNav fn into, so global hotkeys can call it
  arrowNavRef?: React.RefObject<((direction: 'up' | 'down') => void) | null>;
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
  isFocused,
  isFavorite,
  isShared,
  startRenaming: startRenamingProp,
  onSelect,
  onOpen,
  onRename,
  onRenameEnd,
  onDelete,
  onToggleFavorite,
  onShare,
}: {
  folder: Folder;
  isNotEmpty: boolean;
  isSelected: boolean;
  isFocused?: boolean;
  isFavorite: boolean;
  isShared?: boolean;
  startRenaming?: boolean;
  onSelect: () => void;
  onOpen: () => void;
  onRename: (name: string) => void;
  onRenameEnd?: () => void;
  onDelete: () => void;
  onToggleFavorite: () => void;
  onShare: () => void;
}) {
  const [isRenaming, setIsRenaming] = useState(startRenamingProp ?? false);
  const [nameValue, setNameValue] = useState(folder.name);
  const expandTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // If parent marks this folder as newly created, enter rename mode
  useEffect(() => {
    if (startRenamingProp) setIsRenaming(true);
  }, [startRenamingProp]);

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
    onRenameEnd?.();
  }

  return (
    <div
      ref={setNodeRef}
      data-item-id={folder.id}
      style={{
        transform: isDragging ? undefined : CSS.Translate.toString(transform),
        opacity: isDragging ? 0.4 : undefined,
      }}
      className={cn(
        "group flex items-center gap-3 rounded-lg py-2 transition-colors",
        ROW_PX,
        isSelected ? "bg-primary/10" : "hover:bg-accent",
        isFocused && !isSelected && "ring-1 ring-inset ring-primary/50",
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
                onRenameEnd?.();
              }
            }}
            className="flex-1 rounded border border-primary bg-background px-1 text-sm outline-none"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <span className="truncate text-sm">{folder.name}</span>
        )}
        {isShared && <Users size={14} className="shrink-0 fill-primary/20 text-primary" />}
        <button
          tabIndex={-1}
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
              tabIndex={-1}
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={stopRowPropagation}
              onPointerDown={stopRowPropagation}
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
            <DropdownMenuItem onClick={onShare}>
              <Link size={14} className="mr-2" /> Share
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
    </div>
  );
}

function FileRow({
  file,
  isSelected,
  isFocused,
  isFavorite,
  isShared,
  onSelect,
  onOpen,
  onRename,
  onDelete,
  onToggleFavorite,
  onShare,
}: {
  file: FileMetadata;
  isSelected: boolean;
  isFocused?: boolean;
  isFavorite: boolean;
  isShared?: boolean;
  onSelect: () => void;
  onOpen: () => void;
  onRename: (name: string) => void;
  onDelete: () => void;
  onToggleFavorite: () => void;
  onShare: () => void;
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
    <div
      ref={setNodeRef}
      data-item-id={file.id}
      style={{
        transform: isDragging ? undefined : CSS.Translate.toString(transform),
        opacity: isDragging ? 0.4 : undefined,
      }}
      className={cn(
        "group flex items-center gap-3 rounded-lg py-2 transition-colors",
        ROW_PX,
        isSelected ? "bg-primary/10" : "hover:bg-accent",
        isFocused && !isSelected && "ring-1 ring-inset ring-primary/50",
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
        {isShared && <Users size={14} className="shrink-0 fill-primary/20 text-primary" />}
        <button
          tabIndex={-1}
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
              tabIndex={-1}
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={stopRowPropagation}
              onPointerDown={stopRowPropagation}
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
            <DropdownMenuItem onClick={onShare}>
              <Link size={14} className="mr-2" /> Share
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
    </div>
  );
}

function FolderCard({
  folder,
  isNotEmpty,
  isSelected,
  isFocused,
  isFavorite,
  isShared,
  startRenaming: startRenamingProp,
  onSelect,
  onOpen,
  onRename,
  onDelete,
  onRenameEnd,
  onToggleFavorite,
  onShare,
}: {
  folder: Folder;
  isNotEmpty: boolean;
  isSelected: boolean;
  isFocused?: boolean;
  isFavorite: boolean;
  isShared?: boolean;
  startRenaming?: boolean;
  onSelect: () => void;
  onOpen: () => void;
  onRename: (name: string) => void;
  onRenameEnd?: () => void;
  onDelete: () => void;
  onToggleFavorite: () => void;
  onShare: () => void;
}) {
  const [isRenaming, setIsRenaming] = useState(startRenamingProp ?? false);
  const [nameValue, setNameValue] = useState(folder.name);
  const expandTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // If parent marks this folder as newly created, enter rename mode
  useEffect(() => {
    if (startRenamingProp) setIsRenaming(true);
  }, [startRenamingProp]);

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
    onRenameEnd?.();
  }

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: isDragging ? undefined : CSS.Translate.toString(transform),
        opacity: isDragging ? 0.4 : undefined,
      }}
      data-item-id={folder.id}
      className={cn(
        "group relative flex flex-col gap-2 rounded-xl border p-3 transition-colors cursor-pointer",
        isSelected ? "border-primary/40 bg-primary/10" : "border-border/60 bg-card hover:border-border hover:bg-accent/50",
        isFocused && !isSelected && "ring-1 ring-inset ring-primary/50",
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
        <Checkbox tabIndex={-1} checked={isSelected} onCheckedChange={onSelect} className="opacity-100" />
      </div>

      {/* Favorite + menu */}
      <div className="absolute right-2 top-2 z-10 flex flex-col items-end gap-1">
        <div className="flex items-center gap-1">
          <button
            tabIndex={-1}
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
              <Button tabIndex={-1} variant="ghost" size="icon" className="h-6 w-6" onClick={stopRowPropagation} onPointerDown={stopRowPropagation} onDoubleClick={stopRowPropagation}>
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
              <DropdownMenuItem onClick={onShare}>
                <Link size={14} className="mr-2" /> Share
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onDelete} className="text-destructive focus:text-destructive">
                <Trash2 size={14} className="mr-2" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        {isShared && <Users size={14} className="mr-0.5 fill-primary/20 text-primary" />}
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
              if (e.key === "Escape") { setIsRenaming(false); setNameValue(folder.name); onRenameEnd?.(); }
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
    </div>
  );
}

function FileCard({
  file,
  isSelected,
  isFocused,
  isFavorite,
  isShared,
  onSelect,
  onOpen,
  onRename,
  onDelete,
  onToggleFavorite,
  onShare,
}: {
  file: FileMetadata;
  isSelected: boolean;
  isFocused?: boolean;
  isFavorite: boolean;
  isShared?: boolean;
  onSelect: () => void;
  onOpen: () => void;
  onRename: (name: string) => void;
  onDelete: () => void;
  onToggleFavorite: () => void;
  onShare: () => void;
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
    <div
      ref={setNodeRef}
      style={{
        transform: isDragging ? undefined : CSS.Translate.toString(transform),
        opacity: isDragging ? 0.4 : undefined,
      }}
      data-item-id={file.id}
      className={cn(
        "group relative flex flex-col gap-2 rounded-xl border p-3 transition-colors cursor-pointer",
        isSelected ? "border-primary/40 bg-primary/10" : "border-border/60 bg-card hover:border-border hover:bg-accent/50",
        isFocused && !isSelected && "ring-1 ring-inset ring-primary/50",
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
        <Checkbox tabIndex={-1} checked={isSelected} onCheckedChange={onSelect} className="opacity-100" />
      </div>

      {/* Favorite + menu */}
      <div className="absolute right-2 top-2 z-10 flex flex-col items-end gap-1">
        <div className="flex items-center gap-1">
          <button
            tabIndex={-1}
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
              <Button tabIndex={-1} variant="ghost" size="icon" className="h-6 w-6" onClick={stopRowPropagation} onPointerDown={stopRowPropagation} onDoubleClick={stopRowPropagation}>
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
              <DropdownMenuItem onClick={onShare}>
                <Link size={14} className="mr-2" /> Share
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onDelete} className="text-destructive focus:text-destructive">
                <Trash2 size={14} className="mr-2" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        {isShared && <Users size={14} className="mr-0.5 fill-primary/20 text-primary" />}
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
    </div>
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
  onRangeSelect,
  onSelectAll: _onSelectAll,
  onClearSelection,
  sortField,
  sortDir,
  onSort,
  favoriteIds,
  onToggleFavorite,
  sharedIds,
  viewMode,
  childFolders,
  onShareFile,
  onShareFolder,
  creatingFolderId,
  onCreatingFolderEnd,
  focusItemId,
  onFocusItemConsumed,
  contentRef: externalContentRef,
  arrowNavRef,
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

  // ── Arrow-key navigation ───────────────────────────────────────────────────
  const [focusedId, setFocusedId] = useState<string | null>(null);

  // Ordered flat list of all visible items: folders first, then files
  const orderedItems = [...childFolders.map((f) => ({ id: f.id, type: 'folder' as const })),
                        ...files.map((f) => ({ id: f.id, type: 'file' as const }))]

  // Scroll focused item into view
  useEffect(() => {
    if (!focusedId || !contentRef.current) return;
    const el = contentRef.current.querySelector<HTMLElement>(`[data-item-id="${focusedId}"]`);
    el?.scrollIntoView({ block: 'nearest' });
  }, [focusedId]);

  // Clear focused id when items change (e.g. folder navigation)
  useEffect(() => {
    setFocusedId(null);
  }, [currentFolderId]);

  // Focus a specific item requested from outside (e.g. after search navigation).
  // Wait until the item appears in orderedItems (folder may still be loading).
  useEffect(() => {
    if (!focusItemId) return;
    const found = orderedItems.some((item) => item.id === focusItemId);
    if (!found) return;
    setFocusedId(focusItemId);
    onFocusItemConsumed?.();
    contentRef.current?.focus();
  }, [focusItemId, orderedItems, onFocusItemConsumed]);

  const moveNav = useCallback((direction: 'up' | 'down' | 'left' | 'right') => {
    const total = orderedItems.length;
    if (total === 0) return;
    const currentIndex = focusedId ? orderedItems.findIndex((item) => item.id === focusedId) : -1;
    let cols = 1;
    if (viewMode === 'grid' && contentRef.current) {
      const firstEl = contentRef.current.querySelector<HTMLElement>('[data-item-id]');
      const container = firstEl?.parentElement;
      if (firstEl && container) cols = Math.round(container.offsetWidth / firstEl.offsetWidth) || 1;
    }
    let nextIndex = currentIndex;
    if (direction === 'down') nextIndex = currentIndex < 0 ? 0 : Math.min(currentIndex + cols, total - 1);
    else if (direction === 'up') nextIndex = currentIndex < 0 ? 0 : Math.max(currentIndex - cols, 0);
    else if (direction === 'right') nextIndex = currentIndex < 0 ? 0 : Math.min(currentIndex + 1, total - 1);
    else if (direction === 'left') nextIndex = currentIndex < 0 ? 0 : Math.max(currentIndex - 1, 0);
    setFocusedId(orderedItems[nextIndex]?.id ?? null);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusedId, orderedItems, viewMode]);

  // Keep arrowNavRef current so global hotkeys can call moveNav without stale closure
  useEffect(() => {
    if (arrowNavRef) {
      (arrowNavRef as React.MutableRefObject<typeof moveNav>).current = moveNav;
    }
  });

  const handleContentKeyDown = useCallback((e: React.KeyboardEvent) => {
    if ((e.target as HTMLElement).tagName === 'INPUT') return;
    const total = orderedItems.length;
    if (total === 0) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); moveNav('down'); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); moveNav('up'); }
    else if (e.key === 'ArrowRight' && viewMode === 'grid') { e.preventDefault(); moveNav('right'); }
    else if (e.key === 'ArrowLeft' && viewMode === 'grid') { e.preventDefault(); moveNav('left'); }
    else if (e.key === 'Enter') {
      e.preventDefault();
      if (focusedId) {
        const currentIndex = orderedItems.findIndex((item) => item.id === focusedId);
        const item = orderedItems[currentIndex];
        if (item?.type === 'folder') onFolderOpen(item.id);
        else if (item?.type === 'file') onOpenFile(item.id);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusedId, orderedItems, viewMode, moveNav, onFolderOpen, onOpenFile]);
  // ──────────────────────────────────────────────────────────────────────────

  // ── Shift/Ctrl click selection ─────────────────────────────────────────────
  // Anchor for Shift+click range selection
  const lastSelectedId = useRef<string | null>(null);

  const handleContentClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const target = e.target as HTMLElement;
      // Skip clicks on checkboxes (they call onToggleSelect directly), buttons, inputs
      if (target.closest('button') || target.closest('input') || target.closest('[role="checkbox"]')) return;
      const row = target.closest<HTMLElement>('[data-item-id]');
      if (!row) return;
      const id = row.dataset.itemId;
      if (!id) return;

      if (e.shiftKey && lastSelectedId.current) {
        // Range select: select all between lastSelectedId and id
        const anchorIdx = orderedItems.findIndex((item) => item.id === lastSelectedId.current);
        const targetIdx = orderedItems.findIndex((item) => item.id === id);
        if (anchorIdx !== -1 && targetIdx !== -1) {
          const [from, to] = anchorIdx < targetIdx ? [anchorIdx, targetIdx] : [targetIdx, anchorIdx];
          const rangeIds = orderedItems.slice(from, to + 1).map((item) => item.id);
          onRangeSelect(rangeIds);
          return;
        }
      }

      if (e.ctrlKey || e.metaKey) {
        // Ctrl/Cmd: toggle individual item without clearing others
        onToggleSelect(id);
        lastSelectedId.current = id;
        return;
      }

      // Plain click: select only this item
      onClearSelection();
      onToggleSelect(id);
      lastSelectedId.current = id;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [orderedItems, onRangeSelect, onToggleSelect, onClearSelection],
  );
  // ──────────────────────────────────────────────────────────────────────────

  // ── Rubber-band (marquee) selection ────────────────────────────────────────
  // selBox: viewport-relative rect while dragging; null when idle.
  const [selBox, setSelBox] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const selStart = useRef<{ x: number; y: number } | null>(null);
  // Track which IDs are currently rubber-band-selected so we can diff on each move
  const rubberSelected = useRef<Set<string>>(new Set());
  const contentRef = useRef<HTMLDivElement>(null);

  // Forward contentRef to parent so it can programmatically focus the panel
  useEffect(() => {
    if (externalContentRef) {
      (externalContentRef as { current: HTMLDivElement | null }).current = contentRef.current;
    }
  });

  const handleContentPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      // Only left-button; skip if clicking on an interactive element
      if (e.button !== 0) return;
      const target = e.target as HTMLElement;
      if (target.closest("[data-item-id]") || target.closest("button") || target.closest("input")) return;
      // Skip if any Radix dropdown/menu is currently open (portal renders outside contentRef)
      if (document.querySelector('[role="menu"]')) return;

      e.currentTarget.setPointerCapture(e.pointerId);
      selStart.current = { x: e.clientX, y: e.clientY };
      rubberSelected.current = new Set();
      setSelBox({ x: e.clientX, y: e.clientY, w: 0, h: 0 });
      onClearSelection();
    },
    [onClearSelection],
  );

  const handleContentPointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!selStart.current || !contentRef.current) return;

      const x1 = Math.min(selStart.current.x, e.clientX);
      const y1 = Math.min(selStart.current.y, e.clientY);
      const x2 = Math.max(selStart.current.x, e.clientX);
      const y2 = Math.max(selStart.current.y, e.clientY);
      setSelBox({ x: x1, y: y1, w: x2 - x1, h: y2 - y1 });

      // Find all items whose rects intersect the selection box
      const items = contentRef.current.querySelectorAll<HTMLElement>("[data-item-id]");
      const nowInBox = new Set<string>();
      items.forEach((el) => {
        const r = el.getBoundingClientRect();
        if (r.right > x1 && r.left < x2 && r.bottom > y1 && r.top < y2) {
          const id = el.dataset.itemId;
          if (id) nowInBox.add(id);
        }
      });

      // Toggle only items whose state changed since last move
      nowInBox.forEach((id) => { if (!rubberSelected.current.has(id)) onToggleSelect(id); });
      rubberSelected.current.forEach((id) => { if (!nowInBox.has(id)) onToggleSelect(id); });
      rubberSelected.current = nowInBox;
    },
    [onToggleSelect],
  );

  const handleContentPointerUp = useCallback(() => {
    selStart.current = null;
    rubberSelected.current = new Set();
    setSelBox(null);
  }, []);
  // ──────────────────────────────────────────────────────────────────────────

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
          {(["name", "size", "updatedAt"] as const).map((field) => {
            const label = { name: "Name", size: "Size", updatedAt: "Modified" }[field];
            const colClass = field === "name" ? COL_NAME : field === "size" ? COL_SIZE : COL_DATE;
            const isActive = sortField === field;
            const Icon = isActive ? (sortDir === "asc" ? ArrowUp : ArrowDown) : ArrowUpDown;
            return (
              <button
                key={field}
                onClick={() => onSort?.(field)}
                className={cn(
                  "flex items-center gap-1 transition-colors hover:text-foreground",
                  colClass,
                  field !== "name" && "justify-center",
                  isActive ? "text-foreground" : "text-muted-foreground",
                )}
              >
                {label}
                <Icon size={12} className={cn(!isActive && "opacity-40")} />
              </button>
            );
          })}
          <span className={COL_ACTIONS} />
        </div>
      )}

      {/* Content */}
      <div
        ref={contentRef}
        className="relative flex-1 overflow-y-auto py-2 select-none outline-none"
        tabIndex={-1}
        onKeyDown={handleContentKeyDown}
        onClick={handleContentClick}
        onPointerDown={handleContentPointerDown}
        onPointerMove={handleContentPointerMove}
        onPointerUp={handleContentPointerUp}
      >
        {/* Rubber-band selection rectangle — fixed so it stays in viewport during scroll */}
        {selBox && selBox.w > 2 && selBox.h > 2 && (
          <div
            className="pointer-events-none fixed z-50 rounded border border-primary/60 bg-primary/10"
            style={{ left: selBox.x, top: selBox.y, width: selBox.w, height: selBox.h }}
          />
        )}
        {isLoading && (
          <div className="flex h-32 items-center justify-center">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        )}

        {!isLoading && isEmpty && <EmptyState onUpload={onUpload} />}

        {!isLoading && !isEmpty && viewMode === "list" && (
          <>
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
                isFocused={focusedId === folder.id}
                isFavorite={favoriteIds.has(folder.id)}
                isShared={sharedIds.has(folder.id)}
                startRenaming={creatingFolderId === folder.id}
                onSelect={() => onToggleSelect(folder.id)}
                onOpen={() => onFolderOpen(folder.id)}
                onRename={(name) => onFolderRename(folder.id, name)}
                onRenameEnd={onCreatingFolderEnd}
                onDelete={() => onFolderDelete(folder.id)}
                onToggleFavorite={() => onToggleFavorite(folder.id)}
                onShare={() => onShareFolder(folder.id)}
              />
            ))}
            {files.map((file) => (
              <FileRow
                key={file.id}
                file={file}
                isSelected={selectedIds.has(file.id)}
                isFocused={focusedId === file.id}
                isFavorite={favoriteIds.has(file.id)}
                isShared={sharedIds.has(file.id)}
                onSelect={() => onToggleSelect(file.id)}
                onOpen={() => onOpenFile(file.id)}
                onRename={(name) => onRenameFile(file.id, name)}
                onDelete={() => onDeleteFile(file.id)}
                onToggleFavorite={() => onToggleFavorite(file.id)}
                onShare={() => onShareFile(file.id)}
              />
            ))}
          </>
        )}

        {!isLoading && !isEmpty && viewMode === "grid" && (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(140px,1fr))] gap-3 px-4 py-2">
            {childFolders.map((folder) => (
              <FolderCard
                key={folder.id}
                folder={folder}
                isNotEmpty={
                  folders.some((candidate) => candidate.parentId === folder.id) ||
                  allFiles.some((file) => file.folderId === folder.id)
                }
                isSelected={selectedIds.has(folder.id)}
                isFocused={focusedId === folder.id}
                isFavorite={favoriteIds.has(folder.id)}
                isShared={sharedIds.has(folder.id)}
                startRenaming={creatingFolderId === folder.id}
                onSelect={() => onToggleSelect(folder.id)}
                onOpen={() => onFolderOpen(folder.id)}
                onRename={(name) => onFolderRename(folder.id, name)}
                onRenameEnd={onCreatingFolderEnd}
                onDelete={() => onFolderDelete(folder.id)}
                onToggleFavorite={() => onToggleFavorite(folder.id)}
                onShare={() => onShareFolder(folder.id)}
              />
            ))}
            {files.map((file) => (
              <FileCard
                key={file.id}
                file={file}
                isSelected={selectedIds.has(file.id)}
                isFocused={focusedId === file.id}
                isFavorite={favoriteIds.has(file.id)}
                isShared={sharedIds.has(file.id)}
                onSelect={() => onToggleSelect(file.id)}
                onOpen={() => onOpenFile(file.id)}
                onRename={(name) => onRenameFile(file.id, name)}
                onDelete={() => onDeleteFile(file.id)}
                onToggleFavorite={() => onToggleFavorite(file.id)}
                onShare={() => onShareFile(file.id)}
              />
            ))}
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
