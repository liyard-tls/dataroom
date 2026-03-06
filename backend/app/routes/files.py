"""
File management routes.

POST   /files/upload        — upload a file from the browser (multipart/form-data)
GET    /files/              — list files (optional ?folder_id=)
GET    /files/<id>          — file metadata
GET    /files/<id>/view     — serve file inline (for browser preview)
GET    /files/<id>/download — serve file as attachment
PATCH  /files/<id>          — rename or move (update name / folder_id)
DELETE /files/<id>          — delete file from dataroom + disk
"""
from __future__ import annotations

import os
import uuid

from flask import Blueprint, g, jsonify, request, send_file
from werkzeug.utils import secure_filename

from ..extensions import db
from ..middleware import require_owner
from ..models.file import FileRecord
from ..services import file_storage

files_bp = Blueprint("files", __name__)


@files_bp.post("/upload")
@require_owner
def upload_file():
    """
    Upload a file from the browser (multipart/form-data).
    Form fields:
      - file       (required) — the binary file
      - folder_id  (optional) — target folder UUID
    """
    if "file" not in request.files:
        return jsonify({"error": "No file provided"}), 400

    uploaded = request.files["file"]
    if not uploaded.filename:
        return jsonify({"error": "Empty filename"}), 400

    folder_id = request.form.get("folder_id") or None
    mime_type = uploaded.mimetype or "application/octet-stream"
    filename = secure_filename(uploaded.filename)
    content = uploaded.read()

    record = FileRecord(
        name=uploaded.filename,  # preserve original name for display
        mime_type=mime_type,
        size=len(content),
        folder_id=folder_id,
        owner_id=g.owner_id,
    )
    db.session.add(record)
    db.session.flush()  # generate record.id

    storage_path = file_storage.save_file(content, g.owner_id, record.id, filename)
    record.storage_path = storage_path
    db.session.commit()

    return jsonify(record.to_dict()), 201


@files_bp.get("/")
@require_owner
def list_files():
    folder_id = request.args.get("folder_id")  # None means root (no folder)
    query = FileRecord.query.filter_by(owner_id=g.owner_id)
    if folder_id is not None:
        query = query.filter_by(folder_id=folder_id)
    files = query.order_by(FileRecord.created_at.desc()).all()
    return jsonify([f.to_dict() for f in files])


@files_bp.get("/<file_id>")
@require_owner
def get_file(file_id: str):
    record = FileRecord.query.filter_by(id=file_id, owner_id=g.owner_id).first_or_404()
    return jsonify(record.to_dict())


@files_bp.get("/<file_id>/view")
@require_owner
def view_file(file_id: str):
    """Serve file inline so the browser can display it (PDF, image, video, etc.)."""
    record = FileRecord.query.filter_by(id=file_id, owner_id=g.owner_id).first_or_404()
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


@files_bp.get("/<file_id>/download")
@require_owner
def download_file(file_id: str):
    """Force download (Content-Disposition: attachment)."""
    record = FileRecord.query.filter_by(id=file_id, owner_id=g.owner_id).first_or_404()
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


@files_bp.patch("/<file_id>")
@require_owner
def update_file(file_id: str):
    """Rename or move a file (update name and/or folder_id)."""
    record = FileRecord.query.filter_by(id=file_id, owner_id=g.owner_id).first_or_404()
    body = request.get_json(silent=True) or {}

    if "name" in body:
        record.name = body["name"].strip()
    if "folderId" in body:
        record.folder_id = body["folderId"]  # None = root

    db.session.commit()
    return jsonify(record.to_dict())


@files_bp.delete("/<file_id>")
@require_owner
def delete_file(file_id: str):
    """Delete a file from the dataroom (DB + disk). Does not affect Google Drive."""
    record = FileRecord.query.filter_by(id=file_id, owner_id=g.owner_id).first_or_404()

    # Remove from disk first; if this fails we still want to continue
    if record.storage_path:
        try:
            file_storage.delete_file(record.storage_path)
        except Exception:
            pass  # Log in production; don't block the DB delete

    db.session.delete(record)
    db.session.commit()
    return jsonify({"deleted": file_id})
