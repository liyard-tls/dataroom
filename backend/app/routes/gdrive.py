"""
Google Drive import route.

POST /gdrive/import — download selected files (chosen via Google Picker) into the dataroom.

The frontend passes a short-lived Google OAuth access_token obtained directly
from the Picker API, so no server-side token storage is needed.
"""
from __future__ import annotations

from flask import Blueprint, g, jsonify, request

from ..extensions import db
from ..middleware import require_owner
from ..models.file import FileRecord
from ..services import google_drive, file_storage

gdrive_bp = Blueprint("gdrive", __name__)


@gdrive_bp.post("/import")
@require_owner
def import_files():
    """
    Import files from Google Drive into the dataroom.

    Request body:
    {
      "accessToken": "<google oauth access token from Picker>",
      "fileIds": ["gdrive_file_id_1", ...],
      "folderId": "target_folder_id or null"
    }

    Response:
    {
      "imported": [ <FileRecord.to_dict()>, ... ],
      "errors": [ { "fileId": "...", "error": "..." }, ... ]
    }
    """
    body = request.get_json(silent=True) or {}
    access_token: str = body.get("accessToken", "")
    gdrive_ids: list[str] = body.get("fileIds", [])
    folder_id: str | None = body.get("folderId") or None

    if not access_token:
        return jsonify({"error": "accessToken is required"}), 400
    if not gdrive_ids:
        return jsonify({"error": "fileIds is required"}), 400

    imported = []
    errors = []

    for gdrive_id in gdrive_ids:
        try:
            # Skip if already imported (dedup by gdrive_file_id + owner)
            existing = FileRecord.query.filter_by(
                gdrive_file_id=gdrive_id, owner_id=g.owner_id
            ).first()
            if existing:
                imported.append(existing.to_dict())
                continue

            content, filename, mime_type = google_drive.download_file(access_token, gdrive_id)

            record = FileRecord(
                name=filename,
                mime_type=mime_type,
                size=len(content),
                folder_id=folder_id,
                owner_id=g.owner_id,
                gdrive_file_id=gdrive_id,
            )
            db.session.add(record)
            db.session.flush()

            storage_path = file_storage.save_file(content, g.owner_id, record.id, filename)
            record.storage_path = storage_path

            db.session.commit()
            imported.append(record.to_dict())

        except Exception as e:
            errors.append({"fileId": gdrive_id, "error": str(e)})
            db.session.rollback()

    return jsonify({"imported": imported, "errors": errors})
