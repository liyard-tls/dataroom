'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { HardDriveDownload, X, RefreshCw, ExternalLink, Check, AlertCircle } from 'lucide-react'
import { gdriveService, GDriveFile, GDriveStatus } from './gdrive.service'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { formatFileSize } from '@/lib/fileHelpers'

interface GoogleDriveModalProps {
  currentFolderId: string | null
  onImported: () => void
  onClose: () => void
}

function fileSize(bytes?: number) {
  if (!bytes) return ''
  return formatFileSize(bytes)
}

export function GoogleDriveModal({ currentFolderId, onImported, onClose }: GoogleDriveModalProps) {
  const [status, setStatus] = useState<GDriveStatus | null>(null)
  const [files, setFiles] = useState<GDriveFile[]>([])
  const [nextPageToken, setNextPageToken] = useState<string | undefined>()
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [loadingFiles, setLoadingFiles] = useState(false)
  const [importing, setImporting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [importResult, setImportResult] = useState<{ imported: number; errors: number } | null>(null)
  const oauthWindowRef = useRef<Window | null>(null)

  // Load connection status on open
  useEffect(() => {
    gdriveService.getStatus()
      .then(setStatus)
      .catch(() => setStatus({ connected: false }))
  }, [])

  // When connected, load files
  useEffect(() => {
    if (status?.connected) loadFiles()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status?.connected])

  // Poll for OAuth callback (popup closes after redirect to ?gdrive_connected=true)
  useEffect(() => {
    if (!oauthWindowRef.current) return
    const interval = setInterval(() => {
      try {
        if (oauthWindowRef.current?.closed) {
          clearInterval(interval)
          oauthWindowRef.current = null
          // Re-check status
          gdriveService.getStatus().then(setStatus).catch(() => {})
        }
      } catch {
        // cross-origin access throws before redirect completes — ignore
      }
    }, 500)
    return () => clearInterval(interval)
  }, [oauthWindowRef.current]) // eslint-disable-line react-hooks/exhaustive-deps

  async function loadFiles(pageToken?: string) {
    setLoadingFiles(true)
    setError(null)
    try {
      const result = await gdriveService.listFiles(pageToken)
      setFiles(prev => pageToken ? [...prev, ...result.files] : result.files)
      setNextPageToken(result.nextPageToken)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load files')
    } finally {
      setLoadingFiles(false)
    }
  }

  async function handleConnect() {
    try {
      const { authUrl } = await gdriveService.getAuthUrl()
      oauthWindowRef.current = window.open(authUrl, '_blank', 'width=600,height=700')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to get auth URL')
    }
  }

  async function handleDisconnect() {
    await gdriveService.revoke().catch(() => {})
    setStatus({ connected: false })
    setFiles([])
    setSelectedIds(new Set())
  }

  async function handleImport() {
    if (selectedIds.size === 0) return
    setImporting(true)
    setError(null)
    try {
      const result = await gdriveService.importFiles([...selectedIds], currentFolderId)
      setImportResult({ imported: result.imported.length, errors: result.errors.length })
      if (result.errors.length === 0) {
        onImported()
        setTimeout(onClose, 1500)
      } else {
        onImported()
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Import failed')
    } finally {
      setImporting(false)
    }
  }

  function toggleSelect(id: string) {
    setSelectedIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="relative flex h-[560px] w-[520px] flex-col rounded-xl border border-border bg-background shadow-2xl"
        onClick={e => e.stopPropagation()}
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
        <div className="flex flex-1 flex-col overflow-hidden p-5">
          {/* Not connected */}
          {status && !status.connected && (
            <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
              <HardDriveDownload size={40} className="text-muted-foreground/30" />
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

          {/* Connected — file list */}
          {status?.connected && (
            <>
              {status.email && (
                <p className="mb-3 text-xs text-muted-foreground">
                  Connected as <span className="text-foreground">{status.email}</span>
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
                  Imported {importResult.imported} file{importResult.imported !== 1 ? 's' : ''}
                  {importResult.errors > 0 && `, ${importResult.errors} failed`}
                </div>
              )}

              <div className="flex-1 overflow-y-auto">
                {loadingFiles && files.length === 0 && (
                  <div className="flex h-32 items-center justify-center">
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                  </div>
                )}
                {!loadingFiles && files.length === 0 && (
                  <p className="py-8 text-center text-sm text-muted-foreground">No files found in your Drive.</p>
                )}
                {files.map(file => (
                  <div
                    key={file.id}
                    onClick={() => toggleSelect(file.id)}
                    className={cn(
                      "flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 transition-colors hover:bg-accent",
                      selectedIds.has(file.id) && "bg-primary/10 hover:bg-primary/15"
                    )}
                  >
                    <div className={cn(
                      "flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors",
                      selectedIds.has(file.id) ? "border-primary bg-primary" : "border-border"
                    )}>
                      {selectedIds.has(file.id) && <Check size={10} className="text-primary-foreground" />}
                    </div>
                    {file.iconLink && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={file.iconLink} alt="" className="h-4 w-4 shrink-0" />
                    )}
                    <span className="flex-1 truncate text-sm">{file.name}</span>
                    {file.size != null && (
                      <span className="shrink-0 text-xs text-muted-foreground">{fileSize(file.size)}</span>
                    )}
                  </div>
                ))}

                {nextPageToken && (
                  <button
                    onClick={() => loadFiles(nextPageToken)}
                    disabled={loadingFiles}
                    className="mt-2 w-full rounded-lg border border-dashed py-2 text-xs text-muted-foreground transition-colors hover:bg-accent disabled:opacity-50"
                  >
                    {loadingFiles ? 'Loading…' : 'Load more'}
                  </button>
                )}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        {status?.connected && (
          <div className="flex items-center justify-between border-t px-5 py-3">
            <span className="text-xs text-muted-foreground">
              {selectedIds.size > 0 ? `${selectedIds.size} selected` : 'Select files to import'}
            </span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => loadFiles()} disabled={loadingFiles} className="gap-1.5">
                <RefreshCw size={13} className={cn(loadingFiles && "animate-spin")} />
                Refresh
              </Button>
              <Button
                size="sm"
                onClick={handleImport}
                disabled={selectedIds.size === 0 || importing}
                className="gap-1.5"
              >
                {importing
                  ? <><div className="h-3 w-3 animate-spin rounded-full border border-primary-foreground border-t-transparent" /> Importing…</>
                  : <><HardDriveDownload size={13} /> Import</>
                }
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
