# Data Room
A virtual data room for secure document management. Client-side SPA with a swappable storage backend.

## Live Demo
<img width="2556" height="1319" alt="image" src="https://github.com/user-attachments/assets/0c603556-6295-4e7d-8569-0550f533aee3" />

**[dataroom.liyard.cloud](https://dataroom.liyard.cloud)**






## Getting Started

### Frontend

```bash
cp .env.example .env.local
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Backend

```bash
cd backend
cp .env.example .env
docker compose up -d        # PostgreSQL + Flask on port 5001
# or
make up
```

Or manually:

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
flask db upgrade
flask run --port 5001
```

## Tests

```bash
npm run test
```

## Features

- Folder tree with nested navigation and breadcrumbs
- File upload via drag-and-drop or button (20 MB limit)
- List and grid view with sortable columns
- Google Drive import via OAuth2
- Public share links (UUID token, optional expiry, read-only page)
- File viewer: PDF (paginated), images, video, text/markdown
- Favorites, full-text search with debounce
- Multi-select: checkboxes, rubber-band drag
- Context menu with rename, move, delete, share
- Light/dark theme

## Stack

**Frontend** — Next.js 16 · React 19 · TypeScript · Tailwind v4 · Zustand · Firebase Auth · @dnd-kit · Framer Motion

**Backend** — Flask · PostgreSQL · SQLAlchemy · Alembic

## Architecture

Storage access is behind a `StorageAdapter` interface — swap backends by changing one config variable:

```
NEXT_PUBLIC_STORAGE_ADAPTER=flask      # production (Flask REST API)
NEXT_PUBLIC_STORAGE_ADAPTER=indexeddb  # local dev (browser IndexedDB)
```

Files are stored on disk at `uploads/{owner_id}/{file_id}/{filename}`. PostgreSQL stores only metadata. Google Drive OAuth tokens are Fernet-encrypted at rest.

## Deploy

Frontend → Vercel (set env vars in project settings).

Backend → any Docker host. The `backend/docker-compose.yml` runs PostgreSQL + Flask with persistent volumes.
