import uuid
from datetime import datetime, timezone
from ..extensions import db


def _now():
    return datetime.now(timezone.utc)


class ShareLink(db.Model):
    __tablename__ = "share_links"

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    # Unique public token used in the share URL
    token = db.Column(db.String(36), unique=True, nullable=False, default=lambda: str(uuid.uuid4()))
    resource_type = db.Column(db.String(10), nullable=False)  # 'file' | 'folder'
    resource_id = db.Column(db.String(36), nullable=False)
    owner_id = db.Column(db.Text, nullable=False, index=True)
    # NULL = never expires; set by owner to revoke on a date
    expires_at = db.Column(db.DateTime(timezone=True), nullable=True)
    created_at = db.Column(db.DateTime(timezone=True), default=_now, nullable=False)

    def is_active(self) -> bool:
        if self.expires_at is None:
            return True
        return datetime.now(timezone.utc) < self.expires_at

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "token": self.token,
            "resourceType": self.resource_type,
            "resourceId": self.resource_id,
            "ownerId": self.owner_id,
            "expiresAt": self.expires_at.isoformat() if self.expires_at else None,
            "createdAt": self.created_at.isoformat(),
        }
