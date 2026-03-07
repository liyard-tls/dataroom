"""
Public share endpoints — no authentication required.

GET /public/share/<token>             — resolve token → metadata (type, name, etc.)
GET /public/share/<token>/files       — list files/folders inside a shared folder (recursive)
GET /public/share/<token>/file/<id>/view      — serve a file inline
GET /public/share/<token>/file/<id>/download  — download a file
"""
from __future__ import annotations

import os

from flask import Blueprint, jsonify, send_file

from ..extensions import db
from ..models.share_link import ShareLink
from ..models.file import FileRecord
from ..models.folder import Folder
from ..services import file_storage

public_bp = Blueprint("public", __name__)


def _resolve_token(token: str):
    """Return (share, error_response) — one of them is None."""
    share = ShareLink.query.filter_by(token=token).first()
    if not share:
        return None, (jsonify({"error": "Share link not found"}), 404)
    if not share.is_active():
        return None, (jsonify({"error": "Share link has expired"}), 410)
    return share, None


# ---------------------------------------------------------------------------
# Metadata
# ---------------------------------------------------------------------------

@public_bp.get("/share/<token>")
def share_info(token: str):
    """Return info about what a share token points to."""
    share, err = _resolve_token(token)
    if err:
        return err

    if share.resource_type == "file":
        record = FileRecord.query.get(share.resource_id)
        if not record:
            return jsonify({"error": "File not found"}), 404
        return jsonify({
            "share": share.to_dict(),
            "resource": record.to_dict(),
        })
    else:
        folder = Folder.query.get(share.resource_id)
        if not folder:
            return jsonify({"error": "Folder not found"}), 404
        return jsonify({
            "share": share.to_dict(),
            "resource": folder.to_dict(),
        })


# ---------------------------------------------------------------------------
# Folder tree
# ---------------------------------------------------------------------------

@public_bp.get("/share/<token>/tree")
def share_folder_tree(token: str):
    """
    Return the full recursive contents of a shared folder.
    Response: { folders: [...], files: [...] }
    All folders and files belong to the same owner as the shared root.
    """
    share, err = _resolve_token(token)
    if err:
        return err

    if share.resource_type != "folder":
        return jsonify({"error": "This share link points to a file, not a folder"}), 400

    root_folder = Folder.query.get(share.resource_id)
    if not root_folder:
        return jsonify({"error": "Folder not found"}), 404

    owner_id = root_folder.owner_id

    # Collect all descendant folder IDs (BFS)
    all_folder_ids: set[str] = {root_folder.id}
    queue = [root_folder.id]
    while queue:
        batch = Folder.query.filter(
            Folder.parent_id.in_(queue),
            Folder.owner_id == owner_id,
        ).all()
        queue = []
        for f in batch:
            if f.id not in all_folder_ids:
                all_folder_ids.add(f.id)
                queue.append(f.id)

    folders = Folder.query.filter(
        Folder.id.in_(all_folder_ids),
        Folder.owner_id == owner_id,
    ).all()

    files = FileRecord.query.filter(
        FileRecord.folder_id.in_(all_folder_ids),
        FileRecord.owner_id == owner_id,
    ).all()

    return jsonify({
        "folders": [f.to_dict() for f in folders],
        "files": [f.to_dict() for f in files],
    })


# ---------------------------------------------------------------------------
# File serving (works for both file-shares and folder-shares)
# ---------------------------------------------------------------------------

def _get_file_for_share(token: str, file_id: str):
    """
    Validate token and return (FileRecord, None) or (None, error_response).
    For a file share: file_id must match the share resource_id.
    For a folder share: file_id must belong to a folder inside the shared tree.
    """
    share, err = _resolve_token(token)
    if err:
        return None, err

    record = FileRecord.query.get(file_id)
    if not record:
        return None, (jsonify({"error": "File not found"}), 404)

    if share.resource_type == "file":
        if record.id != share.resource_id:
            return None, (jsonify({"error": "File does not belong to this share"}), 403)
    else:
        # Folder share — check that file's folder_id is within the shared tree
        owner_id = record.owner_id
        root_id = share.resource_id

        # Walk up the folder hierarchy to see if root_id is an ancestor
        folder_id = record.folder_id
        visited: set[str] = set()
        found = False
        while folder_id and folder_id not in visited:
            if folder_id == root_id:
                found = True
                break
            visited.add(folder_id)
            parent = Folder.query.filter_by(id=folder_id, owner_id=owner_id).first()
            folder_id = parent.parent_id if parent else None

        if not found:
            return None, (jsonify({"error": "File does not belong to this share"}), 403)

    return record, None


@public_bp.get("/share/<token>/file/<file_id>/view")
def public_view_file(token: str, file_id: str):
    """Serve file inline for browser preview."""
    record, err = _get_file_for_share(token, file_id)
    if err:
        return err

    if not record.storage_path:
        return jsonify({"error": "File not stored on disk"}), 404

    abs = file_storage.abs_path(record.storage_path)
    if not os.path.exists(abs):
        return jsonify({"error": "File not found on disk"}), 404

    return send_file(
        abs,
        mimetype=record.mime_type or "application/octet-stream",
        as_attachment=False,
        download_name=record.name,
    )


@public_bp.get("/share/<token>/file/<file_id>/download")
def public_download_file(token: str, file_id: str):
    """Force download."""
    record, err = _get_file_for_share(token, file_id)
    if err:
        return err

    if not record.storage_path:
        return jsonify({"error": "File not stored on disk"}), 404

    abs = file_storage.abs_path(record.storage_path)
    if not os.path.exists(abs):
        return jsonify({"error": "File not found on disk"}), 404

    return send_file(
        abs,
        mimetype=record.mime_type or "application/octet-stream",
        as_attachment=True,
        download_name=record.name,
    )
