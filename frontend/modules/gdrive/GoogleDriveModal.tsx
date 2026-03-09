"use client";

import { useEffect, useRef, useState } from "react";
import {
  HardDriveDownload,
  X,
  RefreshCw,
  ExternalLink,
  Check,
  AlertCircle,
  Search,
  ChevronRight,
  Home,
} from "lucide-react";
import {
  gdriveService,
  GDriveFile,
  GDriveFolder,
  GDriveStatus,
} from "./gdrive.service";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatFileSize } from "@/lib/fileHelpers";

interface GoogleDriveModalProps {
  currentFolderId: string | null;
  onImported: () => void;
  onClose: () => void;
}

const TYPE_FILTERS = [
  { label: "All", value: "" },
  { label: "PDF", value: "pdf" },
  { label: "Images", value: "image" },
  { label: "Video", value: "video" },
  { label: "Documents", value: "doc" },
] as const;

type TypeFilter = (typeof TYPE_FILTERS)[number]["value"];


export function GoogleDriveModal({
  currentFolderId,
  onImported,
  onClose,
}: GoogleDriveModalProps) {
  const [status, setStatus] = useState<GDriveStatus | null>(null);
  const [files, setFiles] = useState<GDriveFile[]>([]);
  const [folders, setFolders] = useState<GDriveFolder[]>([]);
  const [nextPageToken, setNextPageToken] = useState<string | undefined>();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState<{ done: number; total: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [importResult, setImportResult] = useState<{
    imported: number;
    errors: number;
  } | null>(null);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("");
  // Folder navigation: stack of { id, name }
  const [folderStack, setFolderStack] = useState<
    { id: string; name: string }[]
  >([]);
  const oauthWindowRef = useRef<Window | null>(null);

  const currentDriveFolderId =
    folderStack.length > 0 ? folderStack[folderStack.length - 1].id : null;

  // Debounce search input (400ms)
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    gdriveService
      .getStatus()
      .then(setStatus)
      .catch(() => setStatus({ connected: false }));
  }, []);

  useEffect(() => {
    if (status?.connected) loadItems();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status?.connected]);

  // Reload when folder, type filter, or debounced search changes
  useEffect(() => {
    if (status?.connected) {
      setFiles([]);
      setFolders([]);
      setNextPageToken(undefined);
      loadItems();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentDriveFolderId, typeFilter, debouncedSearch]);

  // Listen for postMessage from the OAuth popup
  useEffect(() => {
    function onMessage(e: MessageEvent) {
      const backendOrigin = (process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://localhost:5001').replace(/\/$/, '')
      // Accept messages only from the current frontend origin (popup posts to opener)
      // The backend HTML posts to FRONTEND_URL so the origin will be the backend.
      if (e.origin !== window.location.origin && e.origin !== new URL(backendOrigin).origin) return
      if (e.data?.type === 'gdrive_connected') {
        oauthWindowRef.current = null
        gdriveService.getStatus().then(setStatus).catch(() => {})
      } else if (e.data?.type === 'gdrive_error') {
        oauthWindowRef.current = null
        setError(`Google Drive error: ${e.data.error ?? 'unknown'}`)
      }
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [])

  async function loadItems(pageToken?: string) {
    setLoadingFiles(true);
    setError(null);
    try {
      const result = await gdriveService.listItems(
        currentDriveFolderId,
        typeFilter,
        debouncedSearch || undefined,
        pageToken,
      );
      setFiles((prev) =>
        pageToken ? [...prev, ...result.files] : result.files,
      );
      setFolders(pageToken ? folders : result.folders);
      setNextPageToken(result.nextPageToken);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load files");
    } finally {
      setLoadingFiles(false);
    }
  }

  async function handleConnect() {
    try {
      const { authUrl } = await gdriveService.getAuthUrl();
      oauthWindowRef.current = window.open(
        authUrl,
        "_blank",
        "width=600,height=700",
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to get auth URL");
    }
  }

  async function handleDisconnect() {
    await gdriveService.revoke().catch(() => {});
    setStatus({ connected: false });
    setFiles([]);
    setFolders([]);
    setSelectedIds(new Set());
    setFolderStack([]);
  }

  async function handleImport() {
    if (selectedIds.size === 0) return;
    const ids = [...selectedIds];
    const total = ids.length;
    setImporting(true);
    setImportProgress({ done: 0, total });
    setError(null);
    let importedCount = 0;
    let errorCount = 0;
    // Import one by one to show real progress
    for (let i = 0; i < ids.length; i++) {
      try {
        const result = await gdriveService.importFiles([ids[i]], currentFolderId);
        importedCount += result.imported.length;
        errorCount += result.errors.length;
      } catch {
        errorCount++;
      }
      setImportProgress({ done: i + 1, total });
    }
    setImportResult({ imported: importedCount, errors: errorCount });
    setImportProgress(null);
    setImporting(false);
    onImported();
    if (errorCount === 0) setTimeout(onClose, 1500);
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function openFolder(id: string, name: string) {
    setFolderStack((prev) => [...prev, { id, name }]);
    setFiles([]);
    setFolders([]);
    setSelectedIds(new Set());
    setSearch("");
    setNextPageToken(undefined);
  }

  function navigateBreadcrumb(index: number) {
    // index=-1 means root
    setFolderStack((prev) => (index < 0 ? [] : prev.slice(0, index + 1)));
    setFiles([]);
    setFolders([]);
    setSelectedIds(new Set());
    setSearch("");
    setNextPageToken(undefined);
  }

  const allVisibleIds = files.map((f) => f.id);
  const allSelected =
    allVisibleIds.length > 0 &&
    allVisibleIds.every((id) => selectedIds.has(id));

  function toggleSelectAll() {
    if (allSelected) {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        allVisibleIds.forEach((id) => next.delete(id));
        return next;
      });
    } else {
      setSelectedIds((prev) => new Set([...prev, ...allVisibleIds]));
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={onClose}
    >
      <div
        className="relative flex h-[680px] w-[680px] flex-col rounded-xl border border-border bg-background shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center gap-3 border-b px-5 py-4">
          <HardDriveDownload size={18} className="text-primary" />
          <span className="font-medium">Import from Google Drive</span>
          <div className="flex-1" />
          {status?.connected && (
            <button
              onClick={handleDisconnect}
              className="text-xs text-muted-foreground underline-offset-2 hover:underline"
            >
              Disconnect
            </button>
          )}
          <button onClick={onClose} className="rounded p-1 hover:bg-accent">
            <X size={15} />
          </button>
        </div>

        {/* Body */}
        <div className="flex flex-1 flex-col overflow-hidden p-4">
          {/* Not connected */}
          {status && !status.connected && (
            <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
              <HardDriveDownload
                size={40}
                className="text-muted-foreground/30"
              />
              <div>
                <p className="font-medium">Connect Google Drive</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Authorize access to import files directly from your Drive.
                </p>
              </div>
              <Button onClick={handleConnect} className="gap-2">
                <ExternalLink size={14} />
                Connect Google Drive
              </Button>
              {error && <p className="text-xs text-destructive">{error}</p>}
            </div>
          )}

          {/* Loading status */}
          {!status && (
            <div className="flex flex-1 items-center justify-center">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          )}

          {/* Connected */}
          {status?.connected && (
            <>
              {/* Account + alerts */}
              {status.email && (
                <p className="mb-3 text-xs text-muted-foreground">
                  Connected as{" "}
                  <span className="text-foreground">{status.email}</span>
                </p>
              )}
              {error && (
                <div className="mb-3 flex items-center gap-2 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                  <AlertCircle size={13} />
                  {error}
                </div>
              )}
              {importResult && (
                <div className="mb-3 flex items-center gap-2 rounded-lg border border-primary/40 bg-primary/10 px-3 py-2 text-xs text-primary">
                  <Check size={13} />
                  Imported {importResult.imported} file
                  {importResult.imported !== 1 ? "s" : ""}
                  {importResult.errors > 0 && `, ${importResult.errors} failed`}
                </div>
              )}

              {/* Search + type filter */}
              <div className="mb-2 flex gap-2">
                <div className="relative flex-1">
                  <Search
                    size={13}
                    className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground"
                  />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search files…"
                    className="h-8 w-full rounded-md border bg-transparent pl-8 pr-3 text-sm outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
                <div className="flex gap-1">
                  {TYPE_FILTERS.map((f) => (
                    <button
                      key={f.value}
                      onClick={() => setTypeFilter(f.value)}
                      className={cn(
                        "rounded-md px-2.5 py-1 text-xs transition-colors",
                        typeFilter === f.value
                          ? "bg-primary text-primary-foreground"
                          : "border hover:bg-accent",
                      )}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Breadcrumb */}
              <div className="mb-3 flex items-center gap-1 text-xs text-muted-foreground px-3 py-1">
                <button
                  onClick={() => navigateBreadcrumb(-1)}
                  className="flex items-center gap-1 hover:text-foreground"
                >
                  <Home size={12} /> My Drive
                </button>
                {folderStack.map((seg, i) => (
                  <span key={seg.id} className="flex items-center gap-1">
                    <ChevronRight size={11} />
                    <button
                      onClick={() => navigateBreadcrumb(i)}
                      className="max-w-[120px] truncate hover:text-foreground"
                    >
                      {seg.name}
                    </button>
                  </span>
                ))}
              </div>

              {/* Select all */}
              {files.length > 0 && (
                <div className="mb-1 flex items-center gap-2 px-3">
                  <button
                    onClick={toggleSelectAll}
                    className={cn(
                      "flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors",
                      allSelected
                        ? "border-primary bg-primary"
                        : "border-border",
                    )}
                  >
                    {allSelected && (
                      <Check size={10} className="text-primary-foreground" />
                    )}
                  </button>
                  <span className="text-xs text-muted-foreground">
                    {allSelected ? "Deselect all" : "Select all"}
                  </span>
                </div>
              )}

              {/* File list */}
              <div className="flex-1 overflow-y-auto">
                {loadingFiles && files.length === 0 && (
                  <div className="flex h-32 items-center justify-center">
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                  </div>
                )}
                {!loadingFiles &&
                  folders.length === 0 &&
                  files.length === 0 && (
                    <p className="py-8 text-center text-sm text-muted-foreground">
                      {search || typeFilter
                        ? "No matches."
                        : "No files found in this folder."}
                    </p>
                  )}

                {/* Folders */}
                {folders.map((folder) => (
                  <div
                    key={folder.id}
                    onClick={() => openFolder(folder.id, folder.name)}
                    className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 transition-colors hover:bg-accent"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {folder.iconLink ? (
                      <img
                        src={folder.iconLink}
                        alt=""
                        className="h-4 w-4 shrink-0"
                      />
                    ) : (
                      <div className="h-4 w-4 shrink-0 rounded-sm bg-muted" />
                    )}
                    <span className="flex-1 truncate text-sm">
                      {folder.name}
                    </span>
                    <ChevronRight
                      size={13}
                      className="shrink-0 text-muted-foreground"
                    />
                  </div>
                ))}

                {/* Files */}
                {files.map((file) => (
                  <div
                    key={file.id}
                    onClick={() => toggleSelect(file.id)}
                    className={cn(
                      "flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 transition-colors hover:bg-accent",
                      selectedIds.has(file.id) &&
                        "bg-primary/10 hover:bg-primary/15",
                    )}
                  >
                    <div
                      className={cn(
                        "flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors",
                        selectedIds.has(file.id)
                          ? "border-primary bg-primary"
                          : "border-border",
                      )}
                    >
                      {selectedIds.has(file.id) && (
                        <Check size={10} className="text-primary-foreground" />
                      )}
                    </div>
                    {file.iconLink ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={file.iconLink}
                        alt=""
                        className="h-4 w-4 shrink-0"
                      />
                    ) : (
                      <div className="h-4 w-4 shrink-0" />
                    )}
                    <span className="flex-1 truncate text-sm">{file.name}</span>
                    {file.size != null && (
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {formatFileSize(file.size)}
                      </span>
                    )}
                  </div>
                ))}

                {nextPageToken && (
                  <button
                    onClick={() => loadItems(nextPageToken)}
                    disabled={loadingFiles}
                    className="mt-2 w-full rounded-lg border border-dashed py-2 text-xs text-muted-foreground transition-colors hover:bg-accent disabled:opacity-50"
                  >
                    {loadingFiles ? "Loading…" : "Load more"}
                  </button>
                )}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        {status?.connected && (
          <div className="flex flex-col gap-2 border-t px-5 py-3">
            {/* Progress bar */}
            {importProgress && (
              <div className="flex items-center gap-3">
                <div className="flex-1 overflow-hidden rounded-full bg-muted h-1.5">
                  <div
                    className="h-full rounded-full bg-primary transition-all duration-300"
                    style={{ width: `${Math.round((importProgress.done / importProgress.total) * 100)}%` }}
                  />
                </div>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {importProgress.done}/{importProgress.total}
                </span>
              </div>
            )}
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                {selectedIds.size > 0
                  ? `${selectedIds.size} selected`
                  : "Select files to import"}
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => loadItems()}
                  disabled={loadingFiles || importing}
                  className="gap-1.5"
                >
                  <RefreshCw
                    size={13}
                    className={cn(loadingFiles && "animate-spin")}
                  />
                  Refresh
                </Button>
                <Button
                  size="sm"
                  onClick={handleImport}
                  disabled={selectedIds.size === 0 || importing}
                  className="gap-1.5"
                >
                  {importing ? (
                    <>
                      <div className="h-3 w-3 animate-spin rounded-full border border-primary-foreground border-t-transparent" />{" "}
                      Importing…
                    </>
                  ) : (
                    <>
                      <HardDriveDownload size={13} /> Import
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
