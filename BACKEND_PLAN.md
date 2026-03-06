# Backend Plan: Python + Flask + PostgreSQL

## Context

Take-home assignment requirements:
- Backend: Flask / Python / PostgreSQL
- Store file metadata in DB for persistence across sessions
- Store OAuth tokens in DB, files on server disk
- Google Drive OAuth integration (import files)
- Work end-to-end locally

---

## Directory Structure

```
backend/
├── app/
│   ├── __init__.py              # Flask app factory
│   ├── config.py                # Config (dev/prod)
│   ├── extensions.py            # SQLAlchemy, Migrate
│   ├── models/
│   │   ├── __init__.py
│   │   ├── folder.py            # Folder model
│   │   ├── file.py              # FileRecord model
│   │   └── oauth_token.py       # OAuthToken model
│   ├── routes/
│   │   ├── __init__.py
│   │   ├── oauth.py             # /oauth/google-drive/*
│   │   ├── files.py             # /files CRUD + import
│   │   └── folders.py           # /folders CRUD
│   └── services/
│       ├── google_drive.py      # Google Drive API client
│       ├── file_storage.py      # Disk storage helper
│       └── token_service.py     # OAuth token CRUD + refresh
├── migrations/                  # Flask-Migrate (Alembic)
├── uploads/                     # Files on disk (gitignored)
├── requirements.txt
├── .env.example
├── .gitignore
└── run.py
```

---

## Data Models

### `folders`
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| name | TEXT | |
| parent_id | UUID FK | self-reference, ON DELETE CASCADE |
| owner_id | TEXT | Firebase UID or session ID |
| created_at | TIMESTAMP | |
| updated_at | TIMESTAMP | |

### `files`
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| name | TEXT | |
| mime_type | TEXT | |
| size | BIGINT | bytes |
| folder_id | UUID FK | ON DELETE SET NULL |
| owner_id | TEXT | |
| gdrive_file_id | TEXT | for deduplication |
| gdrive_web_url | TEXT | link to original |
| storage_path | TEXT | relative from UPLOAD_DIR |
| created_at | TIMESTAMP | |
| updated_at | TIMESTAMP | |

### `oauth_tokens`
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| owner_id | TEXT UNIQUE | |
| provider | TEXT | default 'google_drive' |
| access_token | TEXT | Fernet encrypted |
| refresh_token | TEXT | Fernet encrypted |
| token_expiry | TIMESTAMP | |
| scopes | ARRAY | |
| created_at | TIMESTAMP | |
| updated_at | TIMESTAMP | |

---

## API Endpoints

### OAuth
| Method | Path | Description |
|--------|------|-------------|
| GET | `/oauth/google-drive/authorize` | Returns Google OAuth redirect URL |
| GET | `/oauth/google-drive/callback` | Handles OAuth callback, stores tokens |
| GET | `/oauth/google-drive/status` | Check if GDrive is connected |
| DELETE | `/oauth/google-drive/revoke` | Disconnect Google Drive |

### Google Drive
| Method | Path | Description |
|--------|------|-------------|
| GET | `/gdrive/files` | List files in Google Drive |
| POST | `/gdrive/import` | Import selected files from GDrive |

### Files
| Method | Path | Description |
|--------|------|-------------|
| GET | `/files` | List files (optional ?folder_id=) |
| GET | `/files/:id` | File metadata |
| GET | `/files/:id/view` | View file inline in browser |
| GET | `/files/:id/download` | Download file |
| PATCH | `/files/:id` | Rename / move |
| DELETE | `/files/:id` | Delete file from dataroom |

### Folders
| Method | Path | Description |
|--------|------|-------------|
| GET | `/folders` | Full folder tree |
| POST | `/folders` | Create folder |
| PATCH | `/folders/:id` | Rename |
| POST | `/folders/:id/move` | Move to new parent |
| DELETE | `/folders/:id` | Delete (cascade) |

---

## Key Implementation Details

### Google OAuth Flow
```
1. Frontend calls GET /oauth/google-drive/authorize
2. Backend returns { auth_url: "https://accounts.google.com/..." }
3. Frontend redirects user to auth_url
4. Google redirects to GET /oauth/google-drive/callback?code=...
5. Backend exchanges code for tokens
6. Backend encrypts tokens with Fernet and stores in oauth_tokens table
7. Backend redirects to frontend with ?gdrive_connected=true
```

### Token Auto-Refresh
- Before every Google Drive API call, check `token_expiry`
- If expired: use `refresh_token` to get new `access_token` automatically
- If refresh also fails (revoked): return `401 { "error": "gdrive_reauth_required" }`

### File Storage on Disk
```
uploads/
  {owner_id}/
    {file_id}/
      original_filename.pdf
```
- `storage_path` in DB is relative from `UPLOAD_DIR`
- `/files/:id/view` → `send_file(..., as_attachment=False)` for browser inline view
- `/files/:id/download` → `send_file(..., as_attachment=True)`

### Token Encryption
```python
from cryptography.fernet import Fernet
cipher = Fernet(settings.FERNET_KEY)
encrypted = cipher.encrypt(token.encode()).decode()
decrypted = cipher.decrypt(token.encode()).decode()
```

### Frontend Integration
Current frontend uses IndexedDB. To connect to this backend:
1. Add `FlaskApiAdapter` in `modules/storage/adapters/flask-api.adapter.ts`
2. Implements the existing `StorageAdapter` interface
3. Switch via `NEXT_PUBLIC_STORAGE_ADAPTER=api` in `.env`
4. Pass Firebase UID as `X-User-ID` header

---

## Implementation Order

1. Flask app factory + config + extensions
2. SQLAlchemy models + migrations
3. Google OAuth routes + token encryption
4. Google Drive service (list files, download, auto-refresh)
5. Files API (import, CRUD, view/download)
6. Folders API (CRUD, cascade)
7. CORS + owner_id middleware
8. requirements.txt, .env.example, README
