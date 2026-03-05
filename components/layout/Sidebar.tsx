"use client";

import { useRef, useState } from "react";
import {
  ChevronRight,
  ChevronDown,
  FolderPlus,
  Trash2,
  Pencil,
  Check,
  X,
  PanelLeftClose,
  LogOut,
  Upload,
} from "lucide-react";
import { useDroppable } from "@dnd-kit/core";
import { motion, AnimatePresence } from "framer-motion";
import { Folder } from "@/types/folder.types";
import { AuthUser } from "@/types/auth.types";
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
  isSidebarCollapsed: boolean;
  onToggleSidebar: () => void;
  user: AuthUser | null;
  onUploadFiles: (files: File[]) => void;
  onSignOut: () => void;
}

interface FolderNodeProps {
  folder: Folder;
  allFolders: Folder[];
  currentFolderId: string | null;
  depth: number;
  onNavigate: (id: string | null) => void;
  onCreateFolder: (name: string, parentId: string | null) => void;
  onRenameFolder: (id: string, name: string) => void;
  onDeleteFolder: (id: string) => void;
}

function FolderNode({
  folder,
  allFolders,
  currentFolderId,
  depth,
  onNavigate,
  onCreateFolder,
  onRenameFolder,
  onDeleteFolder,
}: FolderNodeProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [inputValue, setInputValue] = useState("");

  const children = allFolders.filter((f) => f.parentId === folder.id);
  const isActive = currentFolderId === folder.id;

  // Makes this folder a drop target for DnD file/folder moves
  const { setNodeRef, isOver } = useDroppable({ id: `folder-${folder.id}` });

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
    <div ref={setNodeRef}>
      <div
        className={cn(
          "group flex items-center gap-1 rounded-md px-2 py-1.5 text-sm transition-colors",
          isActive && "bg-primary/10 text-primary font-medium",
          !isActive && "hover:bg-accent cursor-pointer",
          isOver && "bg-primary/20 ring-1 ring-primary",
        )}
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
      >
        {/* Expand/collapse toggle */}
        <button
          onClick={() => setIsExpanded((v) => !v)}
          className="flex-shrink-0 p-0.5 text-muted-foreground hover:text-foreground"
        >
          {children.length > 0 ? (
            isExpanded ? (
              <ChevronDown size={12} />
            ) : (
              <ChevronRight size={12} />
            )
          ) : (
            <span className="w-3" />
          )}
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
              <FileIcon type="folder" size={14} />
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
            className="overflow-hidden"
          >
            {isCreating && (
              <div
                className="flex items-center gap-1 px-2 py-1"
                style={{ paddingLeft: `${(depth + 1) * 12 + 8}px` }}
              >
                <FileIcon type="folder" size={14} />
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
            {children.map((child) => (
              <FolderNode
                key={child.id}
                folder={child}
                allFolders={allFolders}
                currentFolderId={currentFolderId}
                depth={depth + 1}
                onNavigate={onNavigate}
                onCreateFolder={onCreateFolder}
                onRenameFolder={onRenameFolder}
                onDeleteFolder={onDeleteFolder}
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
  onToggleSidebar,
  user,
  onUploadFiles,
  onSignOut,
}: SidebarProps) {
  const [isCreatingRoot, setIsCreatingRoot] = useState(false);
  const [rootName, setRootName] = useState("");
  const [failedAvatarUrl, setFailedAvatarUrl] = useState<string | null>(null);
  const uploadInputRef = useRef<HTMLInputElement | null>(null);

  // Root is a drop target too
  const { setNodeRef: setRootRef, isOver: isRootOver } = useDroppable({
    id: "folder-root",
  });

  const rootFolders = folders.filter((f) => f.parentId === null);
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
    <aside className="flex h-full flex-col border-r border-border/40 bg-muted/30">
      {/* Logo + collapse */}
      <div className="flex items-center justify-between px-5 py-4">
        <span className="text-2xl font-bold tracking-tight text-primary">
          Data Room
        </span>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={onToggleSidebar}
          title="Collapse sidebar"
        >
          <PanelLeftClose size={15} />
        </Button>
      </div>

      <div className="flex flex-1 flex-col gap-6 overflow-y-auto px-5 pb-4">
        {/* Quick actions */}
        <div>
          <span className="text-sm font-medium tracking-wide text-muted-foreground">
            Quick Actions
          </span>
          <div className="mt-4 space-y-2">
            <input
              ref={uploadInputRef}
              type="file"
              multiple
              className="sr-only"
              onChange={handleUploadChange}
            />
            <Button
              variant="outline"
              className="h-10 w-full justify-start rounded-lg px-3"
              onClick={() => uploadInputRef.current?.click()}
              title="Upload files"
            >
              <Upload size={15} className="mr-2" />
              Upload files
            </Button>
            <Button
              variant="outline"
              className="h-10 w-full justify-start rounded-lg px-3"
              onClick={() => {
                setIsCreatingRoot(true);
                setRootName("");
              }}
              title="New root folder"
            >
              <FolderPlus size={15} className="mr-2" />
              New folder
            </Button>
          </div>
        </div>

        {/* Favorites */}
        <div>
          <span className="text-sm font-medium tracking-wide text-muted-foreground">
            Favorites
          </span>
          <div className="mt-4">
            <Button
              variant="outline"
              disabled
              className="h-10 w-full justify-start rounded-lg px-3 text-muted-foreground"
            >
              No favorites yet
            </Button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {/* Root drop zone */}
          <button
            ref={setRootRef}
            className={cn(
              "mb-4 block w-full rounded-md px-1 py-1 text-left text-sm font-medium tracking-wide text-muted-foreground transition-colors",
              "hover:text-foreground",
              isRootOver && "bg-accent/60 ring-1 ring-border",
            )}
            onClick={() => onNavigate(null)}
          >
            {roomLabel}
          </button>
          {isCreatingRoot && (
            <div className="mb-2 flex items-center gap-1 px-3 py-1">
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

          {rootFolders.map((folder) => (
            <FolderNode
              key={folder.id}
              folder={folder}
              allFolders={folders}
              currentFolderId={currentFolderId}
              depth={0}
              onNavigate={onNavigate}
              onCreateFolder={onCreateFolder}
              onRenameFolder={onRenameFolder}
              onDeleteFolder={onDeleteFolder}
            />
          ))}
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
              <LogOut size={14} className="mr-2" />
              Sign out
            </Button>
          </div>
        </div>
      </div>
    </aside>
  );
}
