# Data Room — Project Plan & Architecture

## Overview

A virtual Data Room application for secure document management. Built as a client-side SPA with modular architecture designed for easy backend/storage migration.

---

## Tech Stack

| Category         | Technology                                      |
|------------------|-------------------------------------------------|
| Framework        | Next.js (App Router, client-side only)          |
| Language         | TypeScript                                      |
| UI               | Tailwind CSS + Shadcn/ui                        |
| State            | Zustand                                         |
| Storage          | IndexedDB (via abstraction layer)               |
| Auth             | Firebase Auth (Google, Apple, email/password)   |
| File Viewer      | react-pdf, native img/video/text                |
| Drag & Drop      | @dnd-kit                                        |
| Animations       | Framer Motion + Tailwind transitions            |
| Tests            | Vitest + React Testing Library                  |
| Hosting          | Vercel                                          |

---

## Core Principles

- **Modularity** — each feature is an isolated module with its own components, hooks, services, and tests
- **Abstraction** — storage layer is behind an interface; swapping IndexedDB for Supabase/Neon requires only a new adapter
- **Comments** — non-obvious logic must be commented; stubs for future features include comments explaining how to extend
- **Scalability** — data models and interfaces are designed to support sharing, multi-user, and cloud storage from day one
- **Readable code** — clear naming, small focused functions, no premature abstractions
- **Tests** — every core module has unit tests covering the basic functionality

---

## Project Structure

```
src/
├── app/                          # Next.js App Router
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   └── register/page.tsx
│   ├── (protected)/
│   │   └── dataroom/page.tsx
│   └── layout.tsx
│
├── modules/                      # Feature modules (isolated)
│   ├── auth/
│   │   ├── components/           # LoginForm, RegisterForm, AuthGuard
│   │   ├── hooks/                # useAuth
│   │   ├── services/             # auth.service.ts (Firebase wrapper)
│   │   └── index.ts
│   ├── storage/
│   │   ├── adapters/
│   │   │   ├── indexeddb.adapter.ts      # Active adapter
│   │   │   └── supabase.adapter.ts       # Stub for future migration
│   │   ├── interface/
│   │   │   └── storage.interface.ts      # Contract for all adapters
│   │   ├── repositories/
│   │   │   ├── file.repository.ts        # File CRUD via adapter
│   │   │   └── folder.repository.ts      # Folder CRUD via adapter
│   │   └── index.ts
│   ├── files/
│   │   ├── components/           # FileGrid, FileListItem, FileIcon, UploadZone
│   │   ├── hooks/                # useFiles, useFileUpload
│   │   ├── services/             # file.service.ts
│   │   └── index.ts
│   ├── folders/
│   │   ├── components/           # FolderTree, FolderNode, FolderActions
│   │   ├── hooks/                # useFolders, useFolderTree
│   │   ├── services/             # folder.service.ts
│   │   └── index.ts
│   ├── viewer/
│   │   ├── components/
│   │   │   ├── ViewerModal.tsx
│   │   │   ├── PdfViewer.tsx
│   │   │   ├── ImageViewer.tsx
│   │   │   ├── VideoViewer.tsx
│   │   │   └── TextViewer.tsx    # Handles .txt, .md, .json, code
│   │   ├── ViewerFactory.ts      # Selects viewer by mime type
│   │   └── index.ts
│   ├── search/
│   │   ├── components/           # SearchBar, SearchResults
│   │   ├── hooks/                # useSearch (debounced)
│   │   ├── services/             # search.service.ts
│   │   └── index.ts
│   └── sharing/                  # Architecture stub — not implemented in UI
│       ├── interface/
│       │   └── sharing.interface.ts  # Types and method signatures
│       └── index.ts
│
├── components/                   # Shared UI components
│   ├── ui/                       # Shadcn auto-generated components
│   ├── layout/
│   │   ├── Sidebar.tsx           # Left panel: folder tree + actions
│   │   ├── MainPanel.tsx         # Right panel: file grid/list
│   │   └── Breadcrumb.tsx        # Navigation path
│   └── common/
│       ├── FileIcon.tsx          # Icon by file type
│       ├── ContextMenu.tsx       # Right-click menu
│       └── ThemeToggle.tsx       # Light/dark switcher
│
├── store/                        # Zustand stores
│   ├── authStore.ts              # Current user, auth state
│   ├── fileStore.ts              # Files list, selection, sorting
│   ├── folderStore.ts            # Folder tree, current folder
│   └── uiStore.ts                # Theme, viewer modal, sidebar state
│
├── types/                        # Global TypeScript types
│   ├── file.types.ts
│   ├── folder.types.ts
│   ├── auth.types.ts
│   └── sharing.types.ts          # Pre-defined for future sharing feature
│
├── config/
│   ├── theme.config.ts           # Accent color, theme tokens
│   ├── storage.config.ts         # Active adapter selector
│   └── firebase.config.ts        # Firebase initialization
│
├── hooks/                        # Global reusable hooks
│   ├── useDebounce.ts
│   └── useLocalStorage.ts
│
└── lib/                          # Utilities
    ├── utils.ts                  # cn() and general helpers
    └── fileHelpers.ts            # MIME detection, size formatting, etc.
```

---

## Data Models

```typescript
// types/folder.types.ts
interface Folder {
  id: string
  name: string
  parentId: string | null   // null = root
  ownerId: string
  createdAt: Date
  updatedAt: Date
}

// types/file.types.ts
type FileType = 'pdf' | 'image' | 'video' | 'text' | 'md' | 'other'

interface FileRecord {
  id: string
  name: string
  type: FileType
  mimeType: string
  size: number               // bytes, max 20MB enforced on upload
  folderId: string
  ownerId: string
  blob: Blob                 // binary data stored in IndexedDB
  createdAt: Date
  updatedAt: Date
}

// types/sharing.types.ts — pre-defined for future implementation
type ShareRole = 'owner' | 'editor' | 'viewer'

interface SharePermission {
  id: string
  resourceId: string         // fileId or folderId
  resourceType: 'file' | 'folder'
  role: ShareRole
  publicLink: string         // UUID-based public URL token
  expiresAt: Date | null
  createdAt: Date
}
```

---

## Storage Interface

```typescript
// modules/storage/interface/storage.interface.ts
interface StorageAdapter {
  // Folders
  getFolderTree(ownerId: string): Promise<Folder[]>
  getFolderById(id: string): Promise<Folder | null>
  createFolder(folder: Omit<Folder, 'id'>): Promise<Folder>
  updateFolder(id: string, data: Partial<Folder>): Promise<Folder>
  deleteFolder(id: string): Promise<void>        // cascades to children

  // Files
  getFilesByFolder(folderId: string): Promise<FileRecord[]>
  getFileById(id: string): Promise<FileRecord | null>
  createFile(file: Omit<FileRecord, 'id'>): Promise<FileRecord>
  updateFile(id: string, data: Partial<FileRecord>): Promise<FileRecord>
  deleteFile(id: string): Promise<void>
  moveFile(id: string, newFolderId: string): Promise<void>
  moveFolder(id: string, newParentId: string): Promise<void>

  // Search
  search(query: string, ownerId: string): Promise<SearchResult[]>
}

interface SearchResult {
  id: string
  name: string
  type: 'file' | 'folder'
  folderId: string | null
  mimeType?: string
}
```

---

## Implementation Phases

### Phase 1 — Foundation
- [ ] Initialize Next.js + TypeScript + Tailwind + Shadcn
- [ ] `theme.config.ts` — green accent color, light/dark tokens
- [ ] Project folder structure
- [ ] Base TypeScript types (`file.types.ts`, `folder.types.ts`, `sharing.types.ts`)
- [ ] `.env.example`
- [ ] Firebase config
- [ ] Storage interface (empty)
- [ ] Empty Zustand stores

### Phase 2 — Auth Module
- [ ] Firebase Auth: Google, Apple, email/password
- [ ] Login / Register pages
- [ ] Auth guard for protected routes
- [ ] `authStore` — state in localStorage
- [ ] Tests: `auth.service.test.ts`

### Phase 3 — Storage Layer
- [ ] Full IndexedDB adapter implementation
- [ ] `FolderRepository` + `FileRepository`
- [ ] `storage.config.ts` — adapter selector
- [ ] `SupabaseAdapter` stub with migration comments
- [ ] Tests: `indexeddb.adapter.test.ts`, `folder.repository.test.ts`, `file.repository.test.ts`

### Phase 4 — Folder Module
- [ ] Folder CRUD
- [ ] Recursive folder tree rendering
- [ ] `folderStore`
- [ ] Breadcrumb navigation
- [ ] Tests: `folder.service.test.ts`

### Phase 5 — File Module
- [ ] Upload (drag & drop + button), 20MB limit enforced
- [ ] File icons by type
- [ ] File CRUD
- [ ] `fileStore`
- [ ] Tests: `file.service.test.ts`

### Phase 6 — Layout & UI
- [ ] Two-panel layout (Sidebar + MainPanel)
- [ ] Folder tree in Sidebar with DnD
- [ ] File grid/list in MainPanel
- [ ] DnD: move files and folders between folders
- [ ] DnD: upload by dropping onto panel or folder tree
- [ ] Context menu (right-click)
- [ ] Multi-select + bulk delete
- [ ] Sorting: name, date, size
- [ ] Animations (Framer Motion + Tailwind)
- [ ] Tests: `Sidebar.test.tsx`, `MainPanel.test.tsx`

### Phase 7 — Viewer Module
- [ ] `ViewerFactory` — selects viewer by mime type
- [ ] `PdfViewer` (react-pdf)
- [ ] `ImageViewer`
- [ ] `VideoViewer`
- [ ] `TextViewer` (markdown + syntax highlight)
- [ ] Modal/panel display
- [ ] Tests: `viewer.service.test.ts`

### Phase 8 — Search Module
- [ ] Global search (debounced real-time)
- [ ] Filter by file type
- [ ] Result highlighting
- [ ] Tests: `search.service.test.ts`

### Phase 9 — Sharing Architecture (stubs only)
- [ ] `SharePermission` types and interface
- [ ] Stub methods in `StorageAdapter`
- [ ] Comments describing full implementation path

### Phase 10 — Polish & Deploy
- [ ] Light/dark theme toggle
- [ ] Minimal responsive (mobile)
- [ ] Error states, empty states, loading states
- [ ] Toast notifications (Shadcn)
- [ ] README: architecture, setup, env vars, deploy guide
- [ ] Vercel deploy + env vars
- [ ] Final test run

---

## Testing Strategy

**Vitest + React Testing Library**

| Module                  | What is tested                                      |
|-------------------------|-----------------------------------------------------|
| `auth.service`          | login, logout, session persistence                  |
| `indexeddb.adapter`     | CRUD operations, edge cases                         |
| `folder.repository`     | create, cascade delete, move                        |
| `file.repository`       | upload, delete, move, 20MB limit                    |
| `search.service`        | search by name, filter by type                      |
| `viewer` (factory)      | correct viewer selected by mime type                |
| `Sidebar`               | tree rendering, navigation                          |
| `MainPanel`             | file rendering, sorting                             |

---

## Future Architecture (not implemented, designed for)

| Feature              | What is prepared now                                          |
|----------------------|---------------------------------------------------------------|
| Sharing              | `SharePermission` type, interface stubs, comments            |
| Supabase/Neon        | `SupabaseAdapter` stub, `storage.config.ts` switcher         |
| Vercel Blob Storage  | Documented in README as migration path                        |
| Public link sharing  | `publicLink` field in `SharePermission`                       |
| Custom roles         | Extensible `ShareRole` type                                   |
| Theme UI settings    | `theme.config.ts` ready to be wired to a settings panel      |

---

## Environment Variables

See `.env.example` for all required variables. Key categories:
- `NEXT_PUBLIC_FIREBASE_*` — Firebase project config
- `NEXT_PUBLIC_STORAGE_ADAPTER` — active storage adapter (`indexeddb` | `supabase`)

---

## Naming Conventions

- Components: `PascalCase`
- Hooks: `camelCase` prefixed with `use`
- Services: `camelCase` with `.service.ts` suffix
- Types/interfaces: `PascalCase`
- Files: `kebab-case` for non-component files
- Commits: conventional commits (`feat:`, `fix:`, `chore:`, `test:`, `docs:`)
