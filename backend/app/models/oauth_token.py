import uuid
from datetime import datetime, timezone
from ..extensions import db


def _now():
    return datetime.now(timezone.utc)


class OAuthToken(db.Model):
    __tablename__ = "oauth_tokens"

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    # One token record per user per provider
    owner_id = db.Column(db.Text, nullable=False, index=True)
    provider = db.Column(db.Text, nullable=False, default="google_drive")

    # Stored encrypted with Fernet (see token_service.py)
    access_token = db.Column(db.Text, nullable=False)
    refresh_token = db.Column(db.Text, nullable=True)
    token_expiry = db.Column(db.DateTime(timezone=True), nullable=True)

    # Space-separated scopes string
    scopes = db.Column(db.Text, nullable=True)

    created_at = db.Column(db.DateTime(timezone=True), default=_now, nullable=False)
    updated_at = db.Column(db.DateTime(timezone=True), default=_now, onupdate=_now, nullable=False)

    __table_args__ = (
        db.UniqueConstraint("owner_id", "provider", name="uq_oauth_owner_provider"),
    )

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "ownerId": self.owner_id,
            "provider": self.provider,
            "tokenExpiry": self.token_expiry.isoformat() if self.token_expiry else None,
            "scopes": self.scopes.split(" ") if self.scopes else [],
        }
