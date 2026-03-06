import uuid
from datetime import datetime, timezone
from ..extensions import db


def _now():
    return datetime.now(timezone.utc)


class FileRecord(db.Model):
    __tablename__ = "files"

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = db.Column(db.Text, nullable=False)
    mime_type = db.Column(db.Text, nullable=True)
    size = db.Column(db.BigInteger, nullable=True)  # bytes
    folder_id = db.Column(
        db.String(36),
        db.ForeignKey("folders.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    owner_id = db.Column(db.Text, nullable=False, index=True)

    # Google Drive source info (null for locally uploaded files)
    gdrive_file_id = db.Column(db.Text, nullable=True, unique=False)
    gdrive_web_url = db.Column(db.Text, nullable=True)

    # Path relative to UPLOAD_DIR: "{owner_id}/{file_id}/{name}"
    storage_path = db.Column(db.Text, nullable=True)

    created_at = db.Column(db.DateTime(timezone=True), default=_now, nullable=False)
    updated_at = db.Column(db.DateTime(timezone=True), default=_now, onupdate=_now, nullable=False)

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "name": self.name,
            "mimeType": self.mime_type,
            "size": self.size,
            "folderId": self.folder_id,
            "ownerId": self.owner_id,
            "gdriveFileId": self.gdrive_file_id,
            "gdriveWebUrl": self.gdrive_web_url,
            "createdAt": self.created_at.isoformat(),
            "updatedAt": self.updated_at.isoformat(),
        }
