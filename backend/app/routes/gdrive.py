"""
Google Drive browsing and import routes.

GET  /gdrive/files          — list files in the user's Google Drive
POST /gdrive/import         — import selected files into the dataroom
"""
from __future__ import annotations

from flask import Blueprint, g, jsonify, request

from ..extensions import db
from ..middleware import require_owner
from ..models.file import FileRecord
from ..services import google_drive, file_storage, token_service

gdrive_bp = Blueprint("gdrive", __name__)


@gdrive_bp.get("/files")
@require_owner
def list_gdrive_files():
    """
    List folders and files in a Drive folder.
    Query params:
      - folderId  (optional) — Drive folder ID; omit for root
      - pageToken (optional) — pagination token for files
      - pageSize  (optional, default 50)
    """
    try:
        folder_id = request.args.get("folderId") or None
        type_filter = request.args.get("typeFilter") or None
        name_query = request.args.get("nameQuery") or None
        page_token = request.args.get("pageToken")
        page_size = min(int(request.args.get("pageSize", 50)), 100)
        result = google_drive.list_items(
            g.owner_id,
            folder_id=folder_id,
            type_filter=type_filter,
            name_query=name_query,
            page_token=page_token,
            page_size=page_size,
        )
        return jsonify(result)
    except ValueError as e:
        err = str(e)
        if err in ("gdrive_not_connected", "gdrive_reauth_required"):
            return jsonify({"error": err}), 401
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        return jsonify({"error": str(e)}), 502


@gdrive_bp.post("/import")
@require_owner
def import_files():
    """
    Import files from Google Drive into the dataroom.

    Request body:
    {
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
    gdrive_ids: list[str] = body.get("fileIds", [])
    folder_id: str | None = body.get("folderId") or None

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

            content, filename, mime_type = google_drive.download_file(g.owner_id, gdrive_id)

            # Build the FileRecord first to get the id for the storage path
            record = FileRecord(
                name=filename,
                mime_type=mime_type,
                size=len(content),
                folder_id=folder_id,
                owner_id=g.owner_id,
                gdrive_file_id=gdrive_id,
            )
            db.session.add(record)
            db.session.flush()  # generates record.id without committing

            # Save file to disk
            storage_path = file_storage.save_file(content, g.owner_id, record.id, filename)
            record.storage_path = storage_path

            db.session.commit()
            imported.append(record.to_dict())

        except ValueError as e:
            err = str(e)
            if err in ("gdrive_not_connected", "gdrive_reauth_required"):
                return jsonify({"error": err}), 401
            errors.append({"fileId": gdrive_id, "error": err})
            db.session.rollback()
        except Exception as e:
            errors.append({"fileId": gdrive_id, "error": str(e)})
            db.session.rollback()

    return jsonify({"imported": imported, "errors": errors})
