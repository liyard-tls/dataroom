# Data Room Backend

Flask + PostgreSQL backend for the Data Room application.

## Features

- File and folder CRUD (metadata in PostgreSQL, binaries on disk)
- Google Drive OAuth integration (import files from GDrive)
- Automatic OAuth token refresh
- Tokens encrypted at rest with Fernet symmetric encryption
- CORS configured for the Next.js frontend

## Setup

### Option A — Docker Compose (recommended)

```bash
cd backend
cp .env.example .env   # fill in FERNET_KEY, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET
docker compose up --build
```

The entrypoint automatically runs migrations on first start.
API is available at `http://localhost:5001`.

> To generate a Fernet key: `python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"`

---

### Option B — Local Python

#### 1. Prerequisites

- Python 3.11+
- PostgreSQL running locally (or via Docker)

#### 2. Create the database

```bash
createdb dataroom
# or with Docker:
docker run -d --name pg -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=dataroom -p 5432:5432 postgres:16
```

### 3. Install dependencies

```bash
cd backend
python -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

### 4. Configure environment

```bash
cp .env.example .env
```

Edit `.env` with your values:

| Variable | Description |
|----------|-------------|
| `SECRET_KEY` | Flask session secret (any random string) |
| `DATABASE_URL` | PostgreSQL connection string |
| `FERNET_KEY` | Encryption key for OAuth tokens (see below) |
| `GOOGLE_CLIENT_ID` | From Google Cloud Console |
| `GOOGLE_CLIENT_SECRET` | From Google Cloud Console |
| `GOOGLE_REDIRECT_URI` | Must match what's registered in Google Console |
| `FRONTEND_URL` | Next.js dev server URL (for CORS + redirect) |

**Generate a Fernet key:**
```bash
python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
```

### 5. Google OAuth setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a project → Enable **Google Drive API**
3. Create OAuth 2.0 credentials (Web application)
4. Add authorized redirect URI: `http://localhost:5001/oauth/google-drive/callback`
5. Copy Client ID and Client Secret to `.env`

### 6. Run migrations

```bash
flask --app run:app db init    # only first time
flask --app run:app db migrate -m "initial"
flask --app run:app db upgrade
```

### 7. Start the server

```bash
python run.py
# Server starts at http://localhost:5001
```

---

## API Reference

### Health
`GET /health` — returns `{ "status": "ok" }`

### OAuth — Google Drive
| Method | Path | Description |
|--------|------|-------------|
| GET | `/oauth/google-drive/authorize` | Get Google consent URL |
| GET | `/oauth/google-drive/callback` | OAuth callback (called by Google) |
| GET | `/oauth/google-drive/status` | Check if GDrive is connected |
| DELETE | `/oauth/google-drive/revoke` | Disconnect GDrive |

### Google Drive
| Method | Path | Description |
|--------|------|-------------|
| GET | `/gdrive/files` | List files in user's GDrive |
| POST | `/gdrive/import` | Import files from GDrive |

### Files
| Method | Path | Description |
|--------|------|-------------|
| GET | `/files/` | List files (optional `?folder_id=`) |
| GET | `/files/<id>` | File metadata |
| GET | `/files/<id>/view` | View file inline in browser |
| GET | `/files/<id>/download` | Download file |
| PATCH | `/files/<id>` | Rename or move |
| DELETE | `/files/<id>` | Delete from dataroom |

### Folders
| Method | Path | Description |
|--------|------|-------------|
| GET | `/folders/` | All folders (flat list) |
| POST | `/folders/` | Create folder |
| PATCH | `/folders/<id>` | Rename |
| POST | `/folders/<id>/move` | Move to new parent |
| DELETE | `/folders/<id>` | Delete (cascades to children) |

---

## Authentication

All endpoints (except `/health` and OAuth callback) require the header:
```
X-Owner-ID: <firebase-uid>
```

The frontend sends the Firebase UID from the authenticated user.

---

## File Storage

Files are stored at:
```
uploads/{owner_id}/{file_id}/{filename}
```

The `storage_path` column in the `files` table stores the path relative to the `UPLOAD_DIR` root.
