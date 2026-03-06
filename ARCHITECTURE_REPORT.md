# Data Room — Architecture Report

> Generated: 2026-03-06
> Codebase: Next.js 16 / React 19 / TypeScript / Tailwind v4 / Zustand / IndexedDB

---

## 1. Загальна оцінка

Проект має **добру архітектурну основу** — чіткий поділ на шари, абстракція сховища, ізольовані модулі. Для MVP/прототипу це рівень вище середнього. Водночас є конкретні недоліки, які стануть проблемою при зростанні продукту або при підключенні backend.

**Коротко:**
| Критерій | Оцінка |
|---|---|
| Структура та поділ відповідальностей | ✅ Добре |
| Абстракція сховища (Storage Interface) | ✅ Добре |
| Декомпозиція / модульність | ✅ Є, але не завершена |
| Масштабованість | ⚠️ Обмежена (client-only архітектура) |
| Типізація | ✅ Добре |
| Тести | ⚠️ Мінімальні |
| Стан (State management) | ⚠️ Є дублювання |
| Готовність до backend | ⚠️ Потребує рефакторингу адаптера |

---

## 2. Структура проекту

### Що є зараз (реальне дерево файлів)

```
/
├── app/
│   ├── (auth)/login, register       — публічні сторінки
│   ├── (protected)/dataroom/        — головна сторінка (page.tsx ~540 рядків)
│   ├── layout.tsx, providers.tsx
│   └── page.tsx                     — редирект на /dataroom
│
├── modules/
│   ├── auth/        — Firebase Auth (компоненти, хук, сервіс)
│   ├── files/       — хук useFiles + file.service.ts
│   ├── folders/     — хук useFolders + folder.service.ts
│   ├── search/      — SearchBar, useSearch, search.service.ts
│   ├── storage/     — StorageAdapter interface + IndexedDB/Supabase adapters
│   ├── viewer/      — ViewerModal, PdfViewer, ImageViewer, VideoViewer, TextViewer
│   └── sharing/     — тільки interface (не реалізовано)
│
├── components/
│   ├── layout/      — Sidebar, MainPanel, Breadcrumb
│   ├── common/      — FileIcon, ThemeToggle, UploadProgressPanel
│   └── ui/          — Shadcn компоненти
│
├── store/           — Zustand (authStore, fileStore, folderStore, uiStore)
├── types/           — file.types, folder.types, auth.types, sharing.types
├── config/          — firebase.config, storage.config, theme.config
├── hooks/           — useDebounce
└── lib/             — utils.ts, fileHelpers.ts
```

### Відповідність CLAUDE.md
Структура загалом відповідає задуму в CLAUDE.md. Виняток: `lib/fileHelpers.ts` задокументовано як `fileHelpers.ts` — є, але `useLocalStorage.ts` відсутній (не реалізовано).

---

## 3. Аналіз шарів архітектури

### 3.1 Storage Layer — ✅ Сильна сторона

`StorageAdapter` interface — найкраще рішення в проекті. Будь-який backend підключається через один файл (`modules/storage/index.ts`). Singleton патерн коректний. IndexedDB адаптер повністю реалізований з правильними індексами, транзакціями та каскадним видаленням.

**Недоліки адаптера:**
- `getFilesByFolder(null)` — виконує `getAll()` і фільтрує в JS. При великій кількості файлів це повний scan. IndexedDB не може індексувати `null` — відомое обмеження, але варто задокументувати.
- `_collectDescendantFolderIds` — рекурсивний sequential loop (не паралельний). При глибокій ієрархії буде N послідовних IDB-запитів. Можна паралелізувати через `Promise.all`.
- `search()` — повний scan усіх файлів і папок. Немає обмеження результатів, немає debounce на рівні сервісу (є тільки в `useSearch`).

### 3.2 Modules — ✅ Добра ізоляція

Кожен модуль: `components/ + hooks/ + services/ + index.ts`. Залежності йдуть тільки вниз (компоненти → хуки → сервіси → адаптер). Немає циклічних імпортів.

**Недоліки:**
- `modules/files/` — відсутня папка `components/`. FileGrid, FileListItem тощо живуть у `components/layout/MainPanel.tsx`, що суперечить модульному підходу.
- `modules/folders/` — аналогічно, FolderTree/FolderNode живуть у `Sidebar.tsx`, а не в модулі.
- `folder.service.ts` — містить `buildBreadcrumb()`, яка є утилітою для UI, а не бізнес-логікою сховища. Краще перенести в `lib/`.

### 3.3 State Management (Zustand) — ⚠️ Є дублювання

**Проблема:** сортування визначено в двох місцях:
- `fileStore.ts` має `sortField` / `sortDirection` (тип `SortField = 'name' | 'createdAt' | 'size'`)
- `dataroom/page.tsx` має окремий `sortField` / `sortDir` state (тип `'name' | 'size' | 'updatedAt'`)

`useFiles` повертає `sortedFiles` відсортований за `fileStore.sortField`, але в `page.tsx` цей результат сортується **ще раз** через `displayedFiles` useMemo. Тобто файли сортуються двічі, а `fileStore.setSorting` взагалі ніде не викликається — поле в store мертве.

**Проблема:** `viewMode`, `sortField`, `sortDir`, `filterTypes` зберігаються як локальний `useState` в `page.tsx`. При перезавантаженні сторінки вони скидаються. Логічніше тримати їх у `uiStore` з persist.

### 3.4 dataroom/page.tsx — ⚠️ Занадто великий

~540 рядків в одному файлі. Містить:
- DnD логіку (handleDragStart, handleDragEnd, колізії)
- Фільтрацію і сортування (displayedFiles, displayedFolders)
- Header з 4+ dropdown/button групами
- Sidebar та MainPanel оркестрацію

Це не монолітна проблема — логіка розподілена по модулях — але сам page.tsx є "God component" для orchestration. Оптимально винести DnD логіку в окремий хук `useDragAndDrop`, а header controls у окремий компонент.

### 3.5 Auth — ✅ Добре

Firebase Auth правильно обгорнутий у `authService`. `AuthGuard` захищає роут. `authStore` містить мінімальний стан. Єдине: Apple Sign-In потребує реального Apple Developer account і домену — на localhost не працює.

---

## 4. Декомпозиція vs Моноліт

Проект **не є монолітом**. Є чіткий поділ:

```
UI Components → Hooks → Services → StorageAdapter → IndexedDB
```

Але декомпозиція **не завершена**:

| Шар | Стан |
|---|---|
| Storage (adapter/interface) | Повна ізоляція ✅ |
| Auth module | Повна ізоляція ✅ |
| Search module | Повна ізоляція ✅ |
| Viewer module | Повна ізоляція ✅ |
| Files module | Часткова — UI компоненти в layout/ ⚠️ |
| Folders module | Часткова — UI компоненти в layout/ ⚠️ |
| Sharing module | Тільки types/interface, нема реалізації ⚠️ |
| DnD | Логіка розмита між page.tsx та компонентами ⚠️ |

**Висновок:** архітектурний скелет правильний, але кілька модулів "протікають" у layout-компоненти.

---

## 5. Підключення Python + Flask + PostgreSQL backend

### 5.1 Що треба зробити

Поточна архітектура дозволяє підключити backend **без зміни UI** — потрібно тільки написати новий адаптер.

**Кроки:**

#### Крок 1 — Написати `FlaskAdapter`
```
modules/storage/adapters/flask.adapter.ts
```
Клас реалізує `StorageAdapter` interface. Кожен метод — HTTP запит до Flask API:

```typescript
// Приклад методу
async getFilesByFolder(folderId: string | null): Promise<FileMetadata[]> {
  const url = folderId
    ? `/api/files?folder_id=${folderId}`
    : `/api/files?folder_id=root`
  const res = await fetch(url, { headers: { Authorization: `Bearer ${getToken()}` } })
  if (!res.ok) throw new Error('Failed to fetch files')
  return res.json()
}
```

#### Крок 2 — Зареєструвати адаптер
```typescript
// config/storage.config.ts
export type StorageAdapterType = 'indexeddb' | 'supabase' | 'flask'

// modules/storage/index.ts
case 'flask': return new FlaskAdapter()
```

#### Крок 3 — Flask API (Python)
```python
# Мінімальний набір endpoints
GET  /api/folders             # getFolderTree
GET  /api/folders/:id         # getFolderById
POST /api/folders             # createFolder
PUT  /api/folders/:id         # updateFolder
DELETE /api/folders/:id       # deleteFolder (cascade в PostgreSQL)
PUT  /api/folders/:id/move    # moveFolder

GET  /api/files?folder_id=    # getFilesByFolder
GET  /api/files/owner/:uid    # getFilesByOwner
GET  /api/files/:id           # getFileById (повертає metadata + download URL або blob)
POST /api/files/upload        # createFile (multipart/form-data)
PUT  /api/files/:id           # updateFile
DELETE /api/files/:id         # deleteFile
PUT  /api/files/:id/move      # moveFile
GET  /api/search?q=&owner=    # search
```

#### Крок 4 — Auth token
Firebase Auth вже є. `FlaskAdapter` повинен передавати Firebase ID Token у кожен запит:
```typescript
import { getAuth } from 'firebase/auth'
const token = await getAuth().currentUser?.getIdToken()
// headers: { Authorization: `Bearer ${token}` }
```
Flask верифікує токен через `firebase-admin` SDK:
```python
import firebase_admin.auth as fa
decoded = fa.verify_id_token(token)
user_id = decoded['uid']
```

#### Крок 5 — Файлові blob'и
Найскладніший момент. Зараз `FileRecord.blob: Blob` зберігається в IndexedDB. При переході на Flask:
- **Варіант A:** Flask приймає `multipart/form-data`, зберігає файл на диску або S3, повертає URL. `getFileById` повертає metadata + URL, фронт завантажує blob окремо.
- **Варіант B:** Flask повертає сам blob у `GET /api/files/:id/download`. Фронт конвертує Response в Blob.

`StorageAdapter` interface визначає `getFileById(): Promise<FileRecord>` де `blob: Blob`. Це **проблема** — blob може бути великим, а інтерфейс не розрізняє "metadata" і "blob download". Потрібно або розширити interface, або повертати blob через окремий URL.

### 5.2 Потенційні проблеми

| Проблема | Опис | Ризик |
|---|---|---|
| **CORS** | Flask повинен дозволити `http://localhost:3000`. Потрібен `flask-cors`. | Низький (легко вирішується) |
| **Auth роздвоєність** | Firebase Auth на фронті + Flask backend. Firebase `uid` стає ключем користувача в PostgreSQL. Потрібно верифікувати кожен запит через `firebase-admin`. | Середній |
| **Blob в interface** | `FileRecord.blob: Blob` — IndexedDB-специфічна концепція. Flask адаптер не може повернути реальний Blob синхронно без окремого fetch. Інтерфейс треба розширити. | Середній |
| **Cascade delete** | В IndexedDB реалізовано вручну. В PostgreSQL — через `ON DELETE CASCADE` на FK. Логіка адаптера спроститься. | Низький |
| **Multi-user** | Зараз `ownerId` зашито у кожен запит, але немає авторизації на рівні ресурсів. PostgreSQL + RLS або middleware потрібні. | Середній |
| **File size 20MB** | Обмеження є на рівні `fileHelpers.validateFileSize()`. При передачі через HTTP multipart потрібно також обмеження на Flask (`MAX_CONTENT_LENGTH`). | Низький |
| **Offline-first** | Зараз IndexedDB дає offline доступ. Flask backend вимагає мережі. Якщо offline потрібен — необхідний Service Worker або local cache. | Високий (якщо offline є вимогою) |
| **Search** | Зараз in-memory пошук. PostgreSQL дасть `ILIKE`, `pg_trgm`, або full-text search — значно краще. | Низький (перевага) |

---

## 6. Масштабованість

### Що добре масштабується

- **StorageAdapter pattern** — горизонтальне масштабування backend без зміни UI
- **Zustand** — легко додати нові slice без переписування
- **Module structure** — нові фічі (sharing, versioning, comments) додаються як нові модулі
- **Types** — `sharing.types.ts` і `SharingAdapter` interface вже визначені

### Що погано масштабується

- **`allFiles` в page.tsx** — при великій кількості файлів (`getFilesByOwner`) вся таблиця завантажується в пам'ять для DnD і search. Потрібна пагінація або virtual scroll.
- **Рекурсивний cascade delete** в IndexedDB — O(n) sequential async calls. При глибоких деревах буде повільно.
- **In-memory search** — пошук по всіх іменах в JS. Прийнятно до ~10k файлів, далі потрібен backend.
- **Blob storage в IndexedDB** — IndexedDB обмежений доступним місцем на диску (зазвичай ~50% вільного місця). При великих відео-файлах можна вичерпати квоту.
- **Client-only SPA** — немає SSR, немає CDN-кешування контенту. Весь стан у браузері одного користувача.

---

## 7. Конкретні баги і недоліки

### 7.1 Дублювання сортування (критично)
`fileStore` має `sortField/sortDirection`, `useFiles` сортує результат, потім `page.tsx` сортує ще раз у `displayedFiles`. `fileStore.setSorting` ніде не викликається — dead code.

### 7.2 Мертвий стан у `fileStore`
`sortField`, `sortDirection` у `fileStore` — не використовуються з UI. `setSorting` — мертва функція.

### 7.3 `folderStore.removeFolder` не каскадний
При видаленні папки з store видаляється тільки вона. Дочірні папки залишаються у `folders[]` з `parentId` що більше не існує. IndexedDB каскадно видаляє їх у БД, але store не синхронізується — треба reload після delete.

### 7.4 Фільтр не скидається при переході до папки
`filterTypes` є `useState` у page.tsx і не скидається при навігації в іншу папку. Якщо користувач відфільтрував "pdf" і зайшов у папку без PDF — порожній екран без пояснення.

### 7.5 `viewMode`, `sortField`, `filterTypes` не персистяться
Після перезавантаження сторінки ці налаштування скидаються до дефолту. Варто додати до `uiStore` з persist.

### 7.6 Відсутній `uiStore` `viewerFile` при persist
`viewerFile: FileRecord | null` не персистується (правильно — `partialize` виключає його), але `FileRecord.blob: Blob` не серіалізується через JSON. Якщо хтось додасть `viewerFile` у persist — буде тихий баг.

### 7.7 Apple Sign-In
Потребує реального домену і Apple Developer account. На localhost з `signInWithPopup` — не працює.

### 7.8 Немає error boundary
Жодного `<ErrorBoundary>`. Будь-який неочікуваний JS throw у viewer, DnD або upload скине весь додаток.

### 7.9 Тести мінімальні
Є 4 тестових файли (`fileHelpers.test.ts`, `folder.service.test.ts`, `ViewerFactory.test.ts`, `indexeddb.adapter.test.ts`). Немає тестів для компонентів, хуків, `useFiles`, `useFolders`, `authStore`.

---

## 8. Рекомендації (пріоритет)

| Пріоритет | Дія |
|---|---|
| 🔴 Критично | Прибрати дублювання сортування — або видалити `sortField` з `fileStore`, або перенести всю sort-логіку туди |
| 🔴 Критично | Після `deleteFolder` — перезавантажувати `folders` зі store або каскадно видаляти дочірні |
| 🟠 Важливо | Перенести `viewMode`, `sortField`, `filterTypes` до `uiStore` з persist |
| 🟠 Важливо | Скидати `filterTypes` при зміні `currentFolderId` |
| 🟠 Важливо | Додати `<ErrorBoundary>` навколо `MainPanel` і `ViewerModal` |
| 🟡 Середнє | Винести DnD логіку з `page.tsx` у `hooks/useDragAndDrop.ts` |
| 🟡 Середнє | Перенести FileCard/FolderCard компоненти з `MainPanel.tsx` у відповідні модулі |
| 🟡 Середнє | Розширити `StorageAdapter` interface для підтримки blob як URL (підготовка до Flask) |
| 🟢 Бажано | Додати пагінацію або virtual scroll для великих списків файлів |
| 🟢 Бажано | Написати тести для `useFiles`, `useFolders`, `Sidebar`, `MainPanel` |
| 🟢 Бажано | Додати Service Worker для offline-доступу при переході на Flask |
