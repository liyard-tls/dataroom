import { getStorageAdapter } from '@/modules/storage'
import { getFileType } from '@/lib/fileHelpers'

const WELCOME_MD = `# Welcome to Data Room

Data Room is a private, browser-based file manager. Your files are stored locally in your browser using IndexedDB — nothing is sent to a server.

## Uploading files

Drag and drop files directly onto the main panel, onto a folder in the sidebar, or use the **Upload files** button. You can also press \`Ctrl+U\` / \`⌘U\` from anywhere in the app.

Supported formats for preview: PDF, images (JPG, PNG, GIF, WebP, SVG), video (MP4, WebM), plain text, Markdown, JSON, and most code files.

## Organizing with folders

Create folders with \`Ctrl+Shift+F\` / \`⌘⇧F\` or the **+** button next to your room name in the sidebar. Folders can be nested to any depth.

Drag files and folders to rearrange them — both in the main panel and in the sidebar tree. Drop a file onto a folder in the sidebar to move it there directly.

To rename a file or folder, double-click its name or use the right-click context menu.

## Previewing files

Click any file to open it in the built-in viewer. Use \`Escape\` to close the viewer.

## Searching

Press \`Ctrl+F\` / \`⌘F\` to open search. Results appear as you type. Use \`↑\` \`↓\` to navigate results and \`Enter\` to jump to the item.

## Selecting items

Click an item to select it. Draw a selection box by clicking and dragging on an empty area. Use \`Ctrl+A\` / \`⌘A\` to select everything in the current folder. Press \`Delete\` to delete selected items.

## Favorites

Star any file or folder via the right-click menu to pin it to the **Favorites** section in the sidebar for quick access.

## Keyboard shortcuts

Open \`Shortcuts.md\` (also in this folder) for the full list.
`

const SHORTCUTS_MD = `# Keyboard Shortcuts

## Files & Folders

| Action | Windows / Linux | macOS |
|---|---|---|
| Upload files | \`Ctrl+U\` | \`⌘U\` |
| New folder | \`Ctrl+Shift+F\` | \`⌘⇧F\` |
| Import from Google Drive | \`Ctrl+Shift+G\` | \`⌘⇧G\` |
| Delete selected | \`Delete\` | \`Delete\` |
| Select all | \`Ctrl+A\` | \`⌘A\` |

## Navigation

| Action | Shortcut |
|---|---|
| Move between items | \`↑\` \`↓\` \`←\` \`→\` |
| Open selected item | \`Enter\` |
| Go to parent folder | \`Backspace\` |
| Focus search | \`Ctrl+F\` / \`⌘F\` |
| Close viewer / clear selection | \`Escape\` |

## Interface

| Action | Windows / Linux | macOS |
|---|---|---|
| Toggle sidebar | \`Ctrl+B\` | \`⌘B\` |
`


function makeBlob(text: string): Blob {
  return new Blob([text], { type: 'text/markdown' })
}

function makeFile(text: string, name: string): { blob: Blob; size: number; name: string } {
  const blob = makeBlob(text)
  return { blob, size: blob.size, name }
}

async function fetchStaticFile(path: string, mimeType: string): Promise<Blob | null> {
  try {
    const res = await fetch(path)
    if (!res.ok) return null
    const buf = await res.arrayBuffer()
    return new Blob([buf], { type: mimeType })
  } catch {
    return null
  }
}

async function createMdFile(
  adapter: ReturnType<typeof getStorageAdapter>,
  name: string,
  content: string,
  folderId: string | null,
  ownerId: string,
) {
  const { blob } = makeFile(content, name)
  console.log(`[seed] createFile: ${name}, folderId=${folderId}`)
  const result = await adapter.createFile({
    name,
    type: getFileType('text/markdown'),
    mimeType: 'text/markdown',
    size: blob.size,
    folderId,
    ownerId,
    blob,
  })
  console.log(`[seed] createFile ok: id=${result.id}, name=${result.name}`)
}

/** Seeds default folders and files for a brand-new user (called once when folder tree is empty). */
export async function seedNewUser(ownerId: string): Promise<void> {
  console.log('[seed] seedNewUser start, ownerId=', ownerId)
  const adapter = getStorageAdapter()

  // Root files
  const welcomePdfBlob = await fetchStaticFile('/Welcome.pdf', 'application/pdf')
  if (welcomePdfBlob) {
    console.log('[seed] createFile: Welcome.pdf, folderId=null')
    const result = await adapter.createFile({
      name: 'Welcome.pdf',
      type: 'pdf',
      mimeType: 'application/pdf',
      size: welcomePdfBlob.size,
      folderId: null,
      ownerId,
      blob: welcomePdfBlob,
    })
    console.log(`[seed] createFile ok: id=${result.id}, name=${result.name}`)
  }
  await createMdFile(adapter, 'Shortcuts.md', SHORTCUTS_MD, null, ownerId)

  // Sample folder structure
  const sampleFolders = ['Documents', 'Media', 'Notes']

  for (const name of sampleFolders) {
    console.log(`[seed] createFolder: ${name}`)
    const folder = await adapter.createFolder({ name, parentId: null, ownerId })
    console.log(`[seed] createFolder ok: id=${folder.id}`)
  }

  console.log('[seed] seedNewUser done')
}
