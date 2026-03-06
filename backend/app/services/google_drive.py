"""
Google Drive API client.
All methods accept owner_id and resolve the access token internally,
including automatic refresh via token_service.
"""
from __future__ import annotations

import io
import requests
from flask import current_app

from . import token_service

DRIVE_API = "https://www.googleapis.com/drive/v3"
DRIVE_DOWNLOAD = "https://www.googleapis.com/drive/v3/files"


def _headers(owner_id: str) -> dict[str, str]:
    token = token_service.get_valid_access_token(owner_id)
    return {"Authorization": f"Bearer {token}"}


def list_files(owner_id: str, page_token: str | None = None, page_size: int = 50) -> dict:
    """
    List files from the user's Google Drive.
    Returns a dict with keys: files, nextPageToken.
    Only returns non-trashed files; excludes Google Docs native formats
    (which cannot be downloaded as-is).
    """
    params = {
        "pageSize": page_size,
        "fields": "nextPageToken, files(id, name, mimeType, size, webViewLink, createdTime, modifiedTime)",
        # Exclude Google Workspace native types (Docs, Sheets, etc.) — they require export
        "q": (
            "trashed = false"
            " and mimeType != 'application/vnd.google-apps.folder'"
            " and mimeType != 'application/vnd.google-apps.document'"
            " and mimeType != 'application/vnd.google-apps.spreadsheet'"
            " and mimeType != 'application/vnd.google-apps.presentation'"
            " and mimeType != 'application/vnd.google-apps.form'"
        ),
        "orderBy": "modifiedTime desc",
    }
    if page_token:
        params["pageToken"] = page_token

    resp = requests.get(f"{DRIVE_API}/files", headers=_headers(owner_id), params=params, timeout=15)
    resp.raise_for_status()
    data = resp.json()

    return {
        "files": [
            {
                "id": f["id"],
                "name": f["name"],
                "mimeType": f.get("mimeType"),
                "size": int(f["size"]) if f.get("size") else None,
                "webViewLink": f.get("webViewLink"),
                "createdAt": f.get("createdTime"),
                "modifiedAt": f.get("modifiedTime"),
            }
            for f in data.get("files", [])
        ],
        "nextPageToken": data.get("nextPageToken"),
    }


def get_file_metadata(owner_id: str, file_id: str) -> dict:
    """Fetch metadata for a single Google Drive file."""
    params = {"fields": "id, name, mimeType, size, webViewLink"}
    resp = requests.get(
        f"{DRIVE_API}/files/{file_id}",
        headers=_headers(owner_id),
        params=params,
        timeout=10,
    )
    resp.raise_for_status()
    return resp.json()


def download_file(owner_id: str, file_id: str) -> tuple[bytes, str, str]:
    """
    Download a file from Google Drive.
    Returns (content_bytes, filename, mime_type).
    """
    # First get metadata to know the filename and mime type
    meta = get_file_metadata(owner_id, file_id)
    filename = meta.get("name", file_id)
    mime_type = meta.get("mimeType", "application/octet-stream")

    resp = requests.get(
        f"{DRIVE_DOWNLOAD}/{file_id}",
        headers=_headers(owner_id),
        params={"alt": "media"},
        stream=True,
        timeout=60,
    )
    resp.raise_for_status()

    content = resp.content
    return content, filename, mime_type
