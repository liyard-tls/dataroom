import uuid
from datetime import datetime, timezone
from ..extensions import db


def _now():
    return datetime.now(timezone.utc)


class Folder(db.Model):
    __tablename__ = "folders"

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = db.Column(db.Text, nullable=False)
    # null = root-level folder
    parent_id = db.Column(db.String(36), db.ForeignKey("folders.id", ondelete="CASCADE"), nullable=True)
    owner_id = db.Column(db.Text, nullable=False, index=True)
    created_at = db.Column(db.DateTime(timezone=True), default=_now, nullable=False)
    updated_at = db.Column(db.DateTime(timezone=True), default=_now, onupdate=_now, nullable=False)

    # Self-referential relationship for cascade deletes
    children = db.relationship(
        "Folder",
        cascade="all, delete-orphan",
        backref=db.backref("parent", remote_side=[id]),
        lazy="select",
    )
    files = db.relationship("FileRecord", cascade="all, delete-orphan", backref="folder", lazy="select")

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "name": self.name,
            "parentId": self.parent_id,
            "ownerId": self.owner_id,
            "createdAt": self.created_at.isoformat(),
            "updatedAt": self.updated_at.isoformat(),
        }
