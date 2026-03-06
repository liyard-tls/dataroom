"""
Handles saving and deleting files on the local disk.
Files are stored at: UPLOAD_DIR/{owner_id}/{file_id}/{filename}
The storage_path saved in the DB is relative to UPLOAD_DIR.
"""
from __future__ import annotations

import os
import shutil

from flask import current_app


def _upload_dir() -> str:
    return current_app.config["UPLOAD_DIR"]


def save_file(content: bytes, owner_id: str, file_id: str, filename: str) -> str:
    """
    Write file bytes to disk.
    Returns the storage_path (relative to UPLOAD_DIR) stored in the DB.
    """
    rel_dir = os.path.join(owner_id, file_id)
    abs_dir = os.path.join(_upload_dir(), rel_dir)
    os.makedirs(abs_dir, exist_ok=True)

    abs_path = os.path.join(abs_dir, filename)
    with open(abs_path, "wb") as f:
        f.write(content)

    return os.path.join(rel_dir, filename)  # relative path stored in DB


def abs_path(storage_path: str) -> str:
    """Resolve a storage_path from the DB to an absolute filesystem path."""
    return os.path.join(_upload_dir(), storage_path)


def delete_file(storage_path: str) -> None:
    """Delete the file and its parent directory if empty."""
    full_path = abs_path(storage_path)
    if os.path.exists(full_path):
        os.remove(full_path)
    # Remove the file_id directory if it's now empty
    parent = os.path.dirname(full_path)
    if os.path.isdir(parent) and not os.listdir(parent):
        shutil.rmtree(parent, ignore_errors=True)
