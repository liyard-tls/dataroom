"""
Folder management routes.

GET    /folders              — full folder tree for the current owner
POST   /folders              — create a folder
PATCH  /folders/<id>         — rename a folder
POST   /folders/<id>/move    — move to a new parent
DELETE /folders/<id>         — delete folder (cascades to children and files via DB)
"""
from __future__ import annotations

from flask import Blueprint, g, jsonify, request

from ..extensions import db
from ..middleware import require_owner
from ..models.folder import Folder
from ..services import file_storage
from ..models.file import FileRecord

folders_bp = Blueprint("folders", __name__)


@folders_bp.get("/")
@require_owner
def list_folders():
    """Return all folders for the owner as a flat list (frontend builds the tree)."""
    folders = Folder.query.filter_by(owner_id=g.owner_id).all()
    return jsonify([f.to_dict() for f in folders])


@folders_bp.post("/")
@require_owner
def create_folder():
    body = request.get_json(silent=True) or {}
    name = (body.get("name") or "").strip()
    if not name:
        return jsonify({"error": "name is required"}), 400

    parent_id = body.get("parentId") or None

    folder = Folder(name=name, parent_id=parent_id, owner_id=g.owner_id)
    db.session.add(folder)
    db.session.commit()
    return jsonify(folder.to_dict()), 201


@folders_bp.patch("/<folder_id>")
@require_owner
def rename_folder(folder_id: str):
    folder = Folder.query.filter_by(id=folder_id, owner_id=g.owner_id).first_or_404()
    body = request.get_json(silent=True) or {}
    name = (body.get("name") or "").strip()
    if not name:
        return jsonify({"error": "name is required"}), 400

    folder.name = name
    db.session.commit()
    return jsonify(folder.to_dict())


@folders_bp.post("/<folder_id>/move")
@require_owner
def move_folder(folder_id: str):
    """Move a folder to a new parent (or to root if parentId is null)."""
    folder = Folder.query.filter_by(id=folder_id, owner_id=g.owner_id).first_or_404()
    body = request.get_json(silent=True) or {}
    new_parent_id = body.get("parentId")  # None = move to root

    # Prevent moving a folder into itself or one of its descendants
    if new_parent_id:
        _assert_not_descendant(folder_id, new_parent_id, g.owner_id)

    folder.parent_id = new_parent_id
    db.session.commit()
    return jsonify(folder.to_dict())


@folders_bp.delete("/<folder_id>")
@require_owner
def delete_folder(folder_id: str):
    """
    Delete a folder and all its descendants (cascade via SQLAlchemy relationship).
    Also deletes files on disk within the cascade.
    """
    folder = Folder.query.filter_by(id=folder_id, owner_id=g.owner_id).first_or_404()

    # Collect all descendant folder IDs to clean up disk files
    all_folder_ids = _collect_descendant_ids(folder_id, g.owner_id)
    all_folder_ids.add(folder_id)

    # Delete files from disk before removing DB records
    files = FileRecord.query.filter(
        FileRecord.folder_id.in_(all_folder_ids),
        FileRecord.owner_id == g.owner_id,
    ).all()
    for f in files:
        if f.storage_path:
            try:
                file_storage.delete_file(f.storage_path)
            except Exception:
                pass

    # SQLAlchemy cascade="all, delete-orphan" handles DB deletion of children
    db.session.delete(folder)
    db.session.commit()
    return jsonify({"deleted": folder_id})


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _collect_descendant_ids(folder_id: str, owner_id: str) -> set[str]:
    """Recursively collect IDs of all descendant folders."""
    result: set[str] = set()
    children = Folder.query.filter_by(parent_id=folder_id, owner_id=owner_id).all()
    for child in children:
        result.add(child.id)
        result |= _collect_descendant_ids(child.id, owner_id)
    return result


def _assert_not_descendant(folder_id: str, target_parent_id: str, owner_id: str) -> None:
    """Raise ValueError if target_parent_id is a descendant of folder_id."""
    descendants = _collect_descendant_ids(folder_id, owner_id)
    if target_parent_id in descendants or target_parent_id == folder_id:
        raise ValueError("Cannot move a folder into itself or one of its descendants")
