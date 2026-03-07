"""
Google Drive API client.
Uses a short-lived access token passed directly from the frontend (via Google Picker OAuth).
No server-side token storage required.
"""
from __future__ import annotations

import requests

DRIVE_API = "https://www.googleapis.com/drive/v3"
DRIVE_DOWNLOAD = "https://www.googleapis.com/drive/v3/files"


def _headers(access_token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {access_token}"}


def get_file_metadata(access_token: str, file_id: str) -> dict:
    """Fetch metadata for a single Google Drive file."""
    params = {"fields": "id, name, mimeType, size, webViewLink"}
    resp = requests.get(
        f"{DRIVE_API}/files/{file_id}",
        headers=_headers(access_token),
        params=params,
        timeout=10,
    )
    resp.raise_for_status()
    return resp.json()


def download_file(access_token: str, file_id: str) -> tuple[bytes, str, str]:
    """
    Download a file from Google Drive.
    Returns (content_bytes, filename, mime_type).
    """
    meta = get_file_metadata(access_token, file_id)
    filename = meta.get("name", file_id)
    mime_type = meta.get("mimeType", "application/octet-stream")

    resp = requests.get(
        f"{DRIVE_DOWNLOAD}/{file_id}",
        headers=_headers(access_token),
        params={"alt": "media"},
        stream=True,
        timeout=60,
    )
    resp.raise_for_status()

    return resp.content, filename, mime_type
