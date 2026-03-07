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


# mimeType filters for each type filter value
_MIME_FILTERS: dict[str, str] = {
    "pdf": "mimeType = 'application/pdf'",
    "image": "mimeType contains 'image/'",
    "video": "mimeType contains 'video/'",
    "doc": (
        "(mimeType contains 'text/' or mimeType contains 'word' or"
        " mimeType contains 'spreadsheet' or mimeType contains 'presentation'"
        " or mimeType = 'application/json')"
    ),
}

# Workspace native types that cannot be downloaded as binary files
_EXCLUDED_WORKSPACE = (
    " and mimeType != 'application/vnd.google-apps.folder'"
    " and mimeType != 'application/vnd.google-apps.document'"
    " and mimeType != 'application/vnd.google-apps.spreadsheet'"
    " and mimeType != 'application/vnd.google-apps.presentation'"
    " and mimeType != 'application/vnd.google-apps.form'"
)


def list_items(
    owner_id: str,
    folder_id: str | None = None,
    type_filter: str | None = None,
    name_query: str | None = None,
    page_token: str | None = None,
    page_size: int = 50,
) -> dict:
    """
    List folders and downloadable files.
    When type_filter or name_query is set, performs a global Drive search (ignores folder_id).
    Returns { files, folders, nextPageToken }.
    """
    common_params = {
        "fields": "nextPageToken, files(id, name, mimeType, size, iconLink, modifiedTime)",
        "pageSize": page_size,
        "orderBy": "modifiedTime desc",
    }
    if page_token:
        common_params["pageToken"] = page_token

    # Global search mode: when type filter or name query is active
    if type_filter or name_query:
        q_parts = ["trashed = false"]
        if type_filter and type_filter in _MIME_FILTERS:
            q_parts.append(_MIME_FILTERS[type_filter])
        else:
            # Exclude non-downloadable workspace types in name-only search
            q_parts.append("mimeType != 'application/vnd.google-apps.folder'")
            q_parts.append("mimeType != 'application/vnd.google-apps.document'")
            q_parts.append("mimeType != 'application/vnd.google-apps.spreadsheet'")
            q_parts.append("mimeType != 'application/vnd.google-apps.presentation'")
            q_parts.append("mimeType != 'application/vnd.google-apps.form'")
        if name_query:
            # Escape single quotes in user input
            safe_query = name_query.replace("'", "\\'")
            q_parts.append(f"name contains '{safe_query}'")
        file_params = {
            **common_params,
            "q": " and ".join(q_parts),
        }
        file_resp = requests.get(f"{DRIVE_API}/files", headers=_headers(owner_id), params=file_params, timeout=15)
        file_resp.raise_for_status()
        file_data = file_resp.json()
        return {
            "folders": [],  # no folder nav in global search mode
            "files": [
                {
                    "id": f["id"],
                    "name": f["name"],
                    "mimeType": f.get("mimeType"),
                    "size": int(f["size"]) if f.get("size") else None,
                    "iconLink": f.get("iconLink"),
                    "modifiedTime": f.get("modifiedTime"),
                }
                for f in file_data.get("files", [])
            ],
            "nextPageToken": file_data.get("nextPageToken"),
        }

    # Folder-based listing
    parent = folder_id or "root"

    # Folders (load up to 100 at once — subfolders are rarely more)
    folder_params = {
        "fields": "files(id, name, iconLink)",
        "pageSize": 100,
        "orderBy": "name",
        "q": f"'{parent}' in parents and trashed = false and mimeType = 'application/vnd.google-apps.folder'",
    }
    folder_resp = requests.get(f"{DRIVE_API}/files", headers=_headers(owner_id), params=folder_params, timeout=15)
    folder_resp.raise_for_status()
    folder_data = folder_resp.json()

    file_params = {
        **common_params,
        "q": (
            f"'{parent}' in parents and trashed = false"
            + _EXCLUDED_WORKSPACE
        ),
    }
    file_resp = requests.get(f"{DRIVE_API}/files", headers=_headers(owner_id), params=file_params, timeout=15)
    file_resp.raise_for_status()
    file_data = file_resp.json()

    return {
        "folders": [
            {"id": f["id"], "name": f["name"], "iconLink": f.get("iconLink")}
            for f in folder_data.get("files", [])
        ],
        "files": [
            {
                "id": f["id"],
                "name": f["name"],
                "mimeType": f.get("mimeType"),
                "size": int(f["size"]) if f.get("size") else None,
                "iconLink": f.get("iconLink"),
                "modifiedTime": f.get("modifiedTime"),
            }
            for f in file_data.get("files", [])
        ],
        "nextPageToken": file_data.get("nextPageToken"),
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
