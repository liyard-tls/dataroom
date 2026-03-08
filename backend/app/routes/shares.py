"""
Share link management routes (owner-authenticated).

POST   /shares/             — create a share link for a file or folder
GET    /shares/             — list all share links created by the owner
DELETE /shares/<id>         — revoke (delete) a share link

Public endpoints (no auth) are in routes/public.py.
"""
from __future__ import annotations

from flask import Blueprint, g, jsonify, request

from ..extensions import db
from ..middleware import require_owner
from ..models.share_link import ShareLink

shares_bp = Blueprint("shares", __name__)


@shares_bp.post("/")
@require_owner
def create_share():
    """
    Create a share link.
    Body: { resourceType: 'file'|'folder', resourceId: str, expiresAt?: ISO string }
    """
    body = request.get_json(silent=True) or {}
    resource_type = body.get("resourceType", "").strip()
    resource_id = (body.get("resourceId") or "").strip()

    if resource_type not in ("file", "folder"):
        return jsonify({"error": "resourceType must be 'file' or 'folder'"}), 400
    if not resource_id:
        return jsonify({"error": "resourceId is required"}), 400

    # Optional expiry
    expires_at = None
    if body.get("expiresAt"):
        from datetime import datetime
        try:
            expires_at = datetime.fromisoformat(body["expiresAt"])
        except ValueError:
            return jsonify({"error": "Invalid expiresAt format"}), 400

    share = ShareLink(
        resource_type=resource_type,
        resource_id=resource_id,
        owner_id=g.owner_id,
        owner_name=getattr(g, "owner_name", None),
        expires_at=expires_at,
    )
    db.session.add(share)
    db.session.commit()
    return jsonify(share.to_dict()), 201


@shares_bp.get("/")
@require_owner
def list_shares():
    """Return all share links owned by the current user."""
    shares = ShareLink.query.filter_by(owner_id=g.owner_id).all()
    return jsonify([s.to_dict() for s in shares])


@shares_bp.get("/resource/<resource_type>/<resource_id>")
@require_owner
def get_shares_for_resource(resource_type: str, resource_id: str):
    """Return share links for a specific resource."""
    shares = ShareLink.query.filter_by(
        owner_id=g.owner_id,
        resource_type=resource_type,
        resource_id=resource_id,
    ).all()
    return jsonify([s.to_dict() for s in shares])


@shares_bp.delete("/<share_id>")
@require_owner
def delete_share(share_id: str):
    """Revoke a share link."""
    share = ShareLink.query.filter_by(id=share_id, owner_id=g.owner_id).first_or_404()
    db.session.delete(share)
    db.session.commit()
    return jsonify({"deleted": share_id})
