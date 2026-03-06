"""
Search route.

GET /search?q=<query>&type=<fileType>

Returns combined folder + file results matching the query.
"""
from __future__ import annotations

from flask import Blueprint, g, jsonify, request

from ..middleware import require_owner
from ..models.file import FileRecord
from ..models.folder import Folder

search_bp = Blueprint("search", __name__)

# Maps MIME type prefix / type to frontend FileType strings
_MIME_TO_TYPE: dict[str, str] = {
    "application/pdf": "pdf",
    "image/": "image",
    "video/": "video",
    "text/markdown": "md",
    "text/": "text",
    "application/json": "text",
}


def _file_type(mime_type: str | None) -> str:
    if not mime_type:
        return "other"
    for prefix, t in _MIME_TO_TYPE.items():
        if mime_type.startswith(prefix):
            return t
    return "other"


@search_bp.get("/")
@require_owner
def search():
    query = (request.args.get("q") or "").strip().lower()
    type_filter = request.args.get("type") or None

    if not query:
        return jsonify([])

    results = []

    # Search folders
    folders = Folder.query.filter(
        Folder.owner_id == g.owner_id,
        Folder.name.ilike(f"%{query}%"),
    ).all()
    for f in folders:
        results.append({
            "id": f.id,
            "name": f.name,
            "type": "folder",
            "folderId": f.parent_id,
        })

    # Search files
    file_query = FileRecord.query.filter(
        FileRecord.owner_id == g.owner_id,
        FileRecord.name.ilike(f"%{query}%"),
    )
    files = file_query.all()
    for f in files:
        ft = _file_type(f.mime_type)
        if type_filter and ft != type_filter:
            continue
        results.append({
            "id": f.id,
            "name": f.name,
            "type": "file",
            "folderId": f.folder_id,
            "fileType": ft,
            "mimeType": f.mime_type,
        })

    return jsonify(results)
