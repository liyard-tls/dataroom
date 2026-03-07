'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { Download, FileIcon as FileIconLucide, Folder, AlertCircle, Loader2 } from 'lucide-react'
import { sharingService, ShareInfo, PublicFolderTree } from '@/modules/sharing/sharing.service'
import { FileIcon } from '@/components/common/FileIcon'
import { Button } from '@/components/ui/button'
import { MIME_TO_FILE_TYPE } from '@/types/file.types'
import { getViewerType } from '@/modules/viewer/ViewerFactory'
import { formatFileSize, formatModifiedDate } from '@/lib/fileHelpers'
import { ThemeToggle } from '@/components/common/ThemeToggle'
import { cn } from '@/lib/utils'

// ---------------------------------------------------------------------------
// Inline viewer that uses a URL instead of a blob
// ---------------------------------------------------------------------------
function InlineViewer({ url, mimeType, name }: { url: string; mimeType: string; name: string }) {
  const fileType = MIME_TO_FILE_TYPE[mimeType] ?? 'other'
  const viewerType = getViewerType(fileType)

  if (viewerType === 'pdf') {
    return (
      <iframe
        src={url}
        className="h-full w-full rounded-lg border"
        title={name}
      />
    )
  }
  if (viewerType === 'image') {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={url} alt={name} className="max-h-full max-w-full rounded-lg object-contain shadow" />
    )
  }
  if (viewerType === 'video') {
    return (
      <video src={url} controls className="max-h-full max-w-full rounded-lg shadow">
        <track kind="captions" />
      </video>
    )
  }
  if (viewerType === 'text') {
    return <TextFromUrl url={url} />
  }
  return (
    <div className="flex flex-col items-center justify-center gap-4 text-muted-foreground">
      <FileIconLucide size={48} className="opacity-30" />
      <p className="text-sm">Preview not available for this file type</p>
    </div>
  )
}

function TextFromUrl({ url }: { url: string }) {
  const [text, setText] = useState<string | null>(null)
  useEffect(() => {
    fetch(url).then((r) => r.text()).then(setText).catch(() => setText('Failed to load'))
  }, [url])
  if (text === null) return <div className="flex justify-center py-12"><Loader2 className="animate-spin" /></div>
  return (
    <pre className="h-full w-full select-text overflow-auto rounded-lg border bg-muted/40 p-4 text-xs font-mono">
      {text}
    </pre>
  )
}

// ---------------------------------------------------------------------------
// File share page
// ---------------------------------------------------------------------------
function FileSharePage({ info, token }: { info: ShareInfo; token: string }) {
  const file = info.resource as { id: string; name: string; mimeType: string; size: number; updatedAt: string }
  const viewUrl = sharingService.fileViewUrl(token, file.id)
  const downloadUrl = sharingService.fileDownloadUrl(token, file.id)
  const fileType = MIME_TO_FILE_TYPE[file.mimeType] ?? 'other'

  return (
    <div className="flex h-screen flex-col">
      {/* Header */}
      <header className="flex items-center gap-3 border-b bg-background px-6 py-3">
        <FileIcon type={fileType} size={20} />
        <div className="flex-1 min-w-0">
          <h1 className="truncate font-semibold text-base">{file.name}</h1>
          <p className="text-xs text-muted-foreground">
            {formatFileSize(file.size)} · {formatModifiedDate(new Date(file.updatedAt))}
          </p>
        </div>
        <ThemeToggle />
        <Button asChild size="sm" className="gap-2">
          <a href={downloadUrl} download={file.name}>
            <Download size={14} /> Download
          </a>
        </Button>
      </header>

      {/* Viewer */}
      <main className="flex flex-1 items-center justify-center overflow-hidden bg-muted/20 p-4">
        <InlineViewer url={viewUrl} mimeType={file.mimeType} name={file.name} />
      </main>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Folder share page
// ---------------------------------------------------------------------------
interface RawFolder { id: string; name: string; parentId: string | null; updatedAt: string }
interface RawFile { id: string; name: string; mimeType: string; size: number; folderId: string | null; updatedAt: string }

function FolderSharePage({ info, token }: { info: ShareInfo; token: string }) {
  const rootFolder = info.resource as unknown as RawFolder
  const [tree, setTree] = useState<PublicFolderTree | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [currentFolderId, setCurrentFolderId] = useState<string>(rootFolder.id)
  const [previewFile, setPreviewFile] = useState<RawFile | null>(null)

  useEffect(() => {
    sharingService.getSharedFolderTree(token)
      .then(setTree)
      .catch((e: Error) => setError(e.message))
  }, [token])

  if (error) return <ErrorPage message={error} />
  if (!tree) return <LoadingPage />

  const folders = tree.folders as unknown as RawFolder[]
  const files = tree.files as unknown as RawFile[]

  // Breadcrumb: walk from currentFolderId up to rootFolder
  function buildBreadcrumb(): RawFolder[] {
    const path: RawFolder[] = []
    let id: string | null = currentFolderId
    while (id) {
      const f = folders.find((x) => x.id === id)
      if (!f) break
      path.unshift(f)
      if (f.id === rootFolder.id) break
      id = f.parentId
    }
    return path
  }

  const breadcrumb = buildBreadcrumb()
  const childFolders = folders.filter((f) => f.parentId === currentFolderId)
  const childFiles = files.filter((f) => f.folderId === currentFolderId)

  return (
    <div className="flex h-screen flex-col">
      {/* Header */}
      <header className="flex items-center gap-3 border-b bg-background px-6 py-3">
        <Folder size={20} className="text-muted-foreground" />
        <div className="flex-1 min-w-0">
          <h1 className="truncate font-semibold text-base">{rootFolder.name}</h1>
          <p className="text-xs text-muted-foreground">
            {folders.length} folder{folders.length !== 1 ? 's' : ''} · {files.length} file{files.length !== 1 ? 's' : ''}
          </p>
        </div>
        <ThemeToggle />
      </header>

      {/* Breadcrumb */}
      {breadcrumb.length > 1 && (
        <nav className="flex items-center gap-1 border-b bg-background px-6 py-2 text-sm text-muted-foreground">
          {breadcrumb.map((f, i) => (
            <span key={f.id} className="flex items-center gap-1">
              {i > 0 && <span>/</span>}
              <button
                onClick={() => setCurrentFolderId(f.id)}
                className={cn(
                  "hover:text-foreground transition-colors",
                  i === breadcrumb.length - 1 ? "text-foreground font-medium" : "",
                )}
              >
                {f.name}
              </button>
            </span>
          ))}
        </nav>
      )}

      <div className="flex flex-1 overflow-hidden">
        {/* File list */}
        <div className="flex-1 overflow-y-auto">
          {childFolders.length === 0 && childFiles.length === 0 ? (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              This folder is empty
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-xs text-muted-foreground">
                  <th className="px-6 py-3 text-left font-medium">Name</th>
                  <th className="px-4 py-3 text-center font-medium w-28">Size</th>
                  <th className="px-4 py-3 text-center font-medium w-36">Modified</th>
                  <th className="w-24 px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {childFolders.map((folder) => (
                  <tr
                    key={folder.id}
                    className="border-b hover:bg-accent/50 cursor-pointer transition-colors"
                    onDoubleClick={() => setCurrentFolderId(folder.id)}
                    onClick={() => setCurrentFolderId(folder.id)}
                  >
                    <td className="flex items-center gap-2 px-6 py-2.5">
                      <FileIcon type="folder" size={16} />
                      <span className="truncate max-w-sm">{folder.name}</span>
                    </td>
                    <td className="px-4 py-2.5 text-center text-muted-foreground">—</td>
                    <td className="px-4 py-2.5 text-center text-muted-foreground">
                      {formatModifiedDate(new Date(folder.updatedAt))}
                    </td>
                    <td className="px-4 py-2.5" />
                  </tr>
                ))}
                {childFiles.map((file) => {
                  const fileType = MIME_TO_FILE_TYPE[file.mimeType] ?? 'other'
                  const canPreview = getViewerType(fileType) !== 'unsupported'
                  return (
                    <tr
                      key={file.id}
                      className={cn(
                        "border-b transition-colors",
                        canPreview ? "hover:bg-accent/50 cursor-pointer" : "",
                        previewFile?.id === file.id ? "bg-primary/10" : "",
                      )}
                      onClick={() => canPreview && setPreviewFile(file)}
                    >
                      <td className="flex items-center gap-2 px-6 py-2.5">
                        <FileIcon type={fileType} size={16} />
                        <span className="truncate max-w-sm">{file.name}</span>
                      </td>
                      <td className="px-4 py-2.5 text-center text-muted-foreground">
                        {formatFileSize(file.size)}
                      </td>
                      <td className="px-4 py-2.5 text-center text-muted-foreground">
                        {formatModifiedDate(new Date(file.updatedAt))}
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <Button asChild size="sm" variant="ghost" className="h-7 gap-1 text-xs">
                          <a
                            href={sharingService.fileDownloadUrl(token, file.id)}
                            download={file.name}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Download size={12} /> Download
                          </a>
                        </Button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Preview panel */}
        {previewFile && (
          <div className="w-[40%] flex-shrink-0 border-l flex flex-col">
            <div className="flex items-center gap-2 border-b px-4 py-2.5">
              <FileIcon type={MIME_TO_FILE_TYPE[previewFile.mimeType] ?? 'other'} size={16} />
              <span className="flex-1 truncate text-sm font-medium">{previewFile.name}</span>
              <Button asChild size="sm" variant="ghost" className="h-7 gap-1 text-xs">
                <a href={sharingService.fileDownloadUrl(token, previewFile.id)} download={previewFile.name}>
                  <Download size={12} /> Download
                </a>
              </Button>
              <button
                className="text-muted-foreground hover:text-foreground text-lg leading-none ml-1"
                onClick={() => setPreviewFile(null)}
              >
                ×
              </button>
            </div>
            <div className="flex flex-1 items-center justify-center overflow-hidden p-4">
              <InlineViewer
                url={sharingService.fileViewUrl(token, previewFile.id)}
                mimeType={previewFile.mimeType}
                name={previewFile.name}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Helper screens
// ---------------------------------------------------------------------------
function LoadingPage() {
  return (
    <div className="flex h-screen items-center justify-center">
      <Loader2 size={28} className="animate-spin text-muted-foreground" />
    </div>
  )
}

function ErrorPage({ message }: { message: string }) {
  return (
    <div className="flex h-screen flex-col items-center justify-center gap-3 text-muted-foreground">
      <AlertCircle size={36} className="text-destructive" />
      <p className="font-medium text-foreground">Link unavailable</p>
      <p className="text-sm">{message}</p>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Root
// ---------------------------------------------------------------------------
export default function SharePage() {
  const { token } = useParams<{ token: string }>()
  const [info, setInfo] = useState<ShareInfo | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    sharingService.getShareInfo(token)
      .then(setInfo)
      .catch((e: Error) => setError(e.message))
  }, [token])

  if (error) return <ErrorPage message={error} />
  if (!info) return <LoadingPage />

  if (info.share.resourceType === 'file') return <FileSharePage info={info} token={token} />
  return <FolderSharePage info={info} token={token} />
}
