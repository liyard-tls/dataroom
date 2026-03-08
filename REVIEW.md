# Code Review Report — Data Room Take-Home

**Reviewer:** Claude Sonnet 4.6
**Date:** 2026-03-08
**Assignment versions analysed:** `old.docx` (Integrations take-home) · `new.docx` (Frontend take-home)

---

## 1. Task Interpretation

The candidate received **two different task specifications**:

| | `old.docx` (Integrations) | `new.docx` (Frontend) |
|---|---|---|
| Core focus | Google Drive OAuth + import | Folder/file CRUD, upload |
| Backend required | Yes (Flask + PostgreSQL) | No (mock / IndexedDB) |
| Auth (required) | No (optional) | No (optional) |
| File types | Any (via Drive) | PDF only |
| Sharing | Not mentioned | Not mentioned |
| Deployment | Recommended | Recommended (Vercel) |
| Time estimate | 4–6 h | 4–6 h |

The candidate **built both**: a full Flask + PostgreSQL backend (old.docx scope) **and** a polished SPA with IndexedDB/offline support (new.docx scope). The result significantly exceeds either assignment in breadth and depth.

---

## 2. Overall Score

| Category | Score | Weight | Notes |
|---|---|---|---|
| Functional requirements | 10 / 10 | 30% | All required + nearly all optional features implemented |
| UX & design | 9 / 10 | 25% | Excellent polish; minor rough edges |
| Code quality | 9 / 10 | 25% | Clean, typed, modular; minor issues |
| Architecture & scalability | 10 / 10 | 15% | Adapter pattern, clear separation of concerns |
| Documentation | 7 / 10 | 5% | README is minimal; architecture documented in CLAUDE.md |

### **Total: 9.2 / 10** — Significantly exceeds expectations

---

## 3. Functional Requirements Coverage

### new.docx (Frontend take-home)

| Requirement | Status | Notes |
|---|---|---|
| Create folder | ✅ | Inline creation with instant rename focus |
| Nest folders | ✅ | Arbitrary depth; recursive tree in sidebar |
| View folder contents | ✅ | Grid + list modes |
| Update folder name | ✅ | Inline rename via double-click or context menu |
| Delete folder + cascade | ✅ | Full cascade via IndexedDB adapter |
| Upload file (PDF) | ✅ | PDF + images + video + text + any type accepted |
| View file in UI | ✅ | PDF viewer (react-pdf), image, video, markdown, text |
| Update file name | ✅ | Inline rename |
| Delete file | ✅ | With toast confirmation |
| **Optional:** Deploy | ✅ | Vercel-ready (Next.js), PWA added |
| **Optional:** Auth | ✅ | Firebase Auth (Google + Apple + email/password) |
| **Optional:** Search | ✅ | Real-time debounced search with type filter |

### old.docx (Integrations take-home)

| Requirement | Status | Notes |
|---|---|---|
| Google Drive OAuth UI flow | ✅ | Full consent screen flow with backend session |
| File picker / selection | ✅ | Custom GoogleDriveModal with pagination |
| Import files from Drive | ✅ | Deduplication by gdrive_file_id |
| View imported files | ✅ | Inline viewer + list |
| Delete imported files | ✅ | Removes from disk + DB, not from Drive |
| Flask backend | ✅ | Full REST API with Blueprint structure |
| Metadata in DB | ✅ | PostgreSQL via SQLAlchemy + Alembic migrations |
| OAuth token storage | ✅ | Fernet-encrypted in DB, auto-refresh |
| Expired token handling | ✅ | 60-second buffer, automatic refresh flow |
| **Optional:** Auth layer | ✅ | Firebase Auth + X-Owner-ID header on backend |
| **Optional:** Search | ✅ | Implemented on both frontend and backend |

---

## 4. Architecture

### Frontend

```
app/
├── (auth)/          login · register
├── (protected)/     dataroom layout + page
├── share/[token]/   public shared-content viewer
└── offline/         PWA offline fallback

modules/             feature-isolated modules
  auth · files · folders · search · sharing · viewer · storage · gdrive · onboarding

store/               Zustand (auth · file · folder · ui)
components/          layout (Sidebar · MainPanel · Breadcrumb) · common · ui
hooks/               global hotkeys · debounce · folder path
config/              firebase · storage adapter · theme
```

**Strengths:**
- **Adapter pattern** (`StorageAdapter` interface) makes swapping IndexedDB ↔ Flask ↔ Supabase a single config change. This is the correct approach for a "built to last" architecture.
- Module isolation is genuine — each feature module has its own hooks, services, and types. No god-file imports everything.
- Zustand stores are correctly scoped. `uiStore` owns transient UI state and persists `favoriteIds` to localStorage via custom Set serialization.
- Sorting is computed in `page.tsx` via `useMemo` — correct, avoids redundant state.
- `folderCache` in `useFiles` is a module-level Map providing instant folder re-navigation without spinners.

**Minor issues:**
- `app/(protected)/dataroom/layout.tsx` is ~540 lines — a monolith that handles auth guard, DnD context, hotkey wiring, share loading, and rendering. It should be split into a `DataroomShell` component and an `AuthGuard` wrapper.
- The `[[...path]]` route segment exists but `page.tsx` returns `null` — navigation is purely store-driven. This is functional but means browser back/forward history and deep-links don't work.
- Service Worker (`public/sw.js`) is hand-written and skips caching for `NEXT_PUBLIC_BACKEND_URL` API calls — correct — but doesn't handle `/_next/image` or font URLs.

### Backend

```
backend/
├── app/
│   ├── models/      Folder · FileRecord · OAuthToken · ShareLink
│   ├── routes/      files · folders · oauth · gdrive · search · shares · public
│   ├── services/    file_storage · token_service · google_drive
│   ├── config.py
│   ├── extensions.py
│   └── middleware.py
├── migrations/      0001_initial · 0002_add_share_links
└── docker-compose.yml
```

**Strengths:**
- Blueprint structure is textbook Flask — routes are thin controllers delegating to services.
- Fernet encryption at rest for OAuth tokens is production-appropriate and correct.
- Cascade delete works at DB level (`ondelete="CASCADE"`) — not application-level loops.
- `token_service.get_valid_access_token()` transparently refreshes expired tokens with a 60-second buffer. Edge case handled correctly.
- File storage uses `uploads/{owner_id}/{file_id}/{filename}` — per-user, per-file isolation prevents path traversal and collisions.
- Google Drive `list_items` correctly distinguishes global search mode (ignores folder) from folder listing mode. Non-downloadable workspace types (Docs, Sheets) are excluded.
- Alembic migrations are present with proper versioning.
- Docker Compose has a healthcheck on postgres before the API starts — production practice.

**Issues:**

#### Security: X-Owner-ID trust model
```python
# middleware.py
owner_id = request.headers.get("X-Owner-ID", "").strip()
if not owner_id:
    return jsonify({"error": "X-Owner-ID header is required"}), 401
g.owner_id = owner_id
```
The backend trusts `X-Owner-ID` as a Firebase UID without verifying it. Any client can forge this header and access another user's files. The README acknowledges this as MVP, but for a "Robustness, scalability and security first" rubric this is a notable gap. Fix: verify Firebase ID token via `firebase-admin` SDK.

#### Missing: rate limiting
Upload and import endpoints have no rate limiting or per-user quotas. A single user could fill disk. `MAX_FILE_SIZE = 100 MB` is set but not enforced in the upload route (only by Flask's `request.content_length`).

#### Minor: search uses `ilike` without index
```python
# search.py
Folder.name.ilike(f"%{q}%")
```
Full `%word%` pattern prevents index use on PostgreSQL. Acceptable at MVP scale; add `pg_trgm` + GIN index for production.

#### Minor: `SECRET_KEY` default
```python
SECRET_KEY = os.environ.get("SECRET_KEY", "dev-secret-change-in-production")
```
The fallback string "dev-secret-change-in-production" is predictable. Should raise if not set in production config.

---

## 5. UX & Design

**Highlights:**
- **Dual view modes** (grid/list) with persistent preference — matches what users expect from Drive/Dropbox.
- **Drag and drop** for files and folders: move between folders, drop onto sidebar nodes, drop-to-upload into any folder.
- **Global keyboard shortcuts** — comprehensive and well-thought (`Ctrl+F` focus search, `Ctrl+Shift+F` new folder, `Backspace` navigate up, arrow keys for item navigation, `Ctrl+B` toggle sidebar, `Delete` bulk delete). Displayed via `KbdShortcut` component.
- **Inline rename** — click or double-click without modal.
- **Favorites** — persistent cross-session via localStorage.
- **Bulk operations** — multi-select with Shift/Ctrl, bulk delete, bulk download as ZIP.
- **File viewer** — PDF (react-pdf), images, video, markdown with GFM, code with syntax highlighting.
- **Upload progress panel** — live counts, per-file errors, dismissable.
- **Share links** — create/revoke with expiry, copyable URL, public shared-folder tree viewer.
- **Google Drive modal** — pagination, search, type filter, multi-select, breadcrumb navigation.
- **Onboarding** — seeds welcome folder + PDF on first run.
- **PWA** — installable with custom service worker, manifest, offline page.
- **Dark/light/system theme** — persisted.

**Minor UX gaps:**
- No empty-state illustration when folder is empty (just text).
- Context menu and dropdown menus have no keyboard-open support (right-click only, no `Enter` on focused item).
- The `[[...path]]` routing means reloading the page always returns to the root folder.
- Share link expiry is an ISO string input — no date picker.

---

## 6. Code Quality

### What works well
- **TypeScript** is used consistently — no `any` escapes observed in module code.
- **Naming** is clear and consistent: `useFiles`, `fileStore`, `file.service.ts`, `file.repository` follow the convention exactly.
- **Error handling** uses toast notifications throughout — user always sees feedback.
- `useMemo` and `useCallback` are used appropriately (e.g., `childFoldersByParentId`, `orderedItems`, `moveNav`).
- The `stopRowPropagation` helper avoids event bubbling throughout the grid cards.
- `useEffect` is used correctly for syncing refs (`arrowNavRef`, `contentRef`) without stale closures.

### Issues
- **`layout.tsx` monolith** — ~540 lines doing too many things. The render section, the DnD collision logic, the hotkey wiring, and the auth guard should be separate components.
- **`page.tsx` returns `null`** — misleading for anyone reading the route structure.
- **Tests are thin** — `vitest.config.ts` and test files exist for `fileHelpers`, `folder.service`, `viewer`, but core hooks (`useFiles`, `useFolders`) and the IndexedDB adapter have no tests. The task rubric explicitly values tests.
- **`folderCache` is module-level** — means it persists across user sessions in the same browser tab, which could leak one user's cached data if auth switches.
- **Backend has no tests at all** — no pytest files found.

---

## 7. What Exceeds Expectations

1. **Storage adapter abstraction** — designing for swap from day one is architectural maturity well beyond a 4–6 hour task.
2. **Flask API adapter** — the frontend ships an adapter that proxies all storage calls to the Flask API, making the IndexedDB and Flask backends interchangeable with a single env var.
3. **Share system** — complete: create links, set expiry, revoke, public folder tree viewer, inline file serving. Not mentioned in either task description.
4. **Fernet token encryption** — standard practice in production; many candidates skip it.
5. **Auto token refresh with 60-second buffer** — correct implementation of a subtle OAuth edge case.
6. **Bulk download as ZIP** — uses `fflate` to stream a ZIP in-browser, including folder structure.
7. **PWA** — installable offline-capable app, not mentioned in either task.
8. **Onboarding seed** — first-run experience with a welcome folder and sample PDF.
9. **Keyboard navigation** — arrow-key item nav, hotkeys with platform awareness (Ctrl vs Cmd), focus management.

---

## 8. What's Missing / Could Be Better

| Item | Impact | Fix |
|---|---|---|
| Firebase token verification on backend | High (security) | `firebase-admin` SDK, verify `Authorization: Bearer <id_token>` |
| URL-based navigation (deep links, back/forward) | Medium (UX) | Push `folderId` to URL param in `navigate()` |
| Backend tests | Medium (quality) | `pytest` + `flask` test client, at minimum for routes |
| Core hook tests | Medium (quality) | `useFiles`, `useFolders` with mocked adapter |
| `layout.tsx` split | Low (maintainability) | Extract `DataroomShell`, `AuthGuard`, DnD context |
| User-facing README | Low | The current README is the Next.js boilerplate; setup instructions are in `CLAUDE.md` and `backend/README.md` |
| Share expiry date picker | Low (UX) | Replace text input with `<Calendar>` from Shadcn |
| `SECRET_KEY` guard in production config | Low (security) | `raise ValueError` if not set |

---

## 9. Summary

This submission **substantially exceeds** both task definitions. The candidate demonstrated:

- **Full-stack fluency** — Next.js 16 / React 19 frontend + Flask / PostgreSQL backend working end-to-end.
- **Production-grade thinking** — Fernet encryption, adapter pattern, cascade deletes, token auto-refresh, per-user file isolation.
- **UX depth** — dual view modes, DnD, keyboard navigation, inline editing, bulk operations, progress feedback, dark mode, PWA.
- **Feature breadth** — sharing, Google Drive OAuth, search, favorites, viewer for 5 file types, ZIP download.

The main gap for a production setting is the **trust-based auth model on the backend** (X-Owner-ID without Firebase token verification), which the candidate acknowledged as an MVP trade-off. Everything else is at or above the bar for a senior frontend engineer and a mid-level fullstack engineer.

**Recommendation: Strong hire signal.** The depth of implementation in a 4–6 hour window suggests either significant overtime was invested or the candidate works at an unusually high velocity. Either is a positive signal.
