"""
Handles storing, retrieving, and refreshing OAuth tokens.
Tokens are encrypted at rest using Fernet symmetric encryption.
"""
from __future__ import annotations

import os
from datetime import datetime, timezone, timedelta

import requests
from cryptography.fernet import Fernet, InvalidToken
from flask import current_app

from ..extensions import db
from ..models.oauth_token import OAuthToken


def _cipher() -> Fernet:
    key = current_app.config.get("FERNET_KEY")
    if not key:
        raise RuntimeError("FERNET_KEY is not configured")
    return Fernet(key.encode() if isinstance(key, str) else key)


def _encrypt(value: str) -> str:
    return _cipher().encrypt(value.encode()).decode()


def _decrypt(value: str) -> str:
    try:
        return _cipher().decrypt(value.encode()).decode()
    except InvalidToken:
        raise ValueError("Failed to decrypt token — key may have changed")


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def save_token(
    owner_id: str,
    access_token: str,
    refresh_token: str | None,
    expiry: datetime | None,
    scopes: list[str] | None = None,
    provider: str = "google_drive",
) -> OAuthToken:
    """Upsert an OAuth token record for the given owner."""
    record = OAuthToken.query.filter_by(owner_id=owner_id, provider=provider).first()
    if record is None:
        record = OAuthToken(owner_id=owner_id, provider=provider)
        db.session.add(record)

    record.access_token = _encrypt(access_token)
    if refresh_token:
        record.refresh_token = _encrypt(refresh_token)
    record.token_expiry = expiry
    record.scopes = " ".join(scopes) if scopes else None

    db.session.commit()
    return record


def get_valid_access_token(owner_id: str, provider: str = "google_drive") -> str:
    """
    Return a valid access token for owner_id.
    Automatically refreshes using the refresh_token if the access token is expired.
    Raises ValueError if no token found or refresh fails.
    """
    record = OAuthToken.query.filter_by(owner_id=owner_id, provider=provider).first()
    if not record:
        raise ValueError("gdrive_not_connected")

    now = datetime.now(timezone.utc)
    expiry = record.token_expiry
    # Treat as expired if within 60 s of expiry or already past
    is_expired = expiry is None or (expiry - now) < timedelta(seconds=60)

    if not is_expired:
        return _decrypt(record.access_token)

    # Attempt refresh
    if not record.refresh_token:
        raise ValueError("gdrive_reauth_required")

    refresh_token = _decrypt(record.refresh_token)
    new_access, new_expiry = _refresh_google_token(refresh_token)

    record.access_token = _encrypt(new_access)
    record.token_expiry = new_expiry
    db.session.commit()

    return new_access


def delete_token(owner_id: str, provider: str = "google_drive") -> None:
    OAuthToken.query.filter_by(owner_id=owner_id, provider=provider).delete()
    db.session.commit()


def token_status(owner_id: str, provider: str = "google_drive") -> dict:
    record = OAuthToken.query.filter_by(owner_id=owner_id, provider=provider).first()
    if not record:
        return {"connected": False}
    return {
        "connected": True,
        "tokenExpiry": record.token_expiry.isoformat() if record.token_expiry else None,
        "scopes": record.scopes.split(" ") if record.scopes else [],
    }


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _refresh_google_token(refresh_token: str) -> tuple[str, datetime]:
    """Exchange a refresh token for a new access token via Google's token endpoint."""
    resp = requests.post(
        "https://oauth2.googleapis.com/token",
        data={
            "client_id": current_app.config["GOOGLE_CLIENT_ID"],
            "client_secret": current_app.config["GOOGLE_CLIENT_SECRET"],
            "refresh_token": refresh_token,
            "grant_type": "refresh_token",
        },
        timeout=10,
    )

    if not resp.ok:
        raise ValueError("gdrive_reauth_required")

    data = resp.json()
    access_token = data["access_token"]
    expires_in = data.get("expires_in", 3600)
    expiry = datetime.now(timezone.utc) + timedelta(seconds=expires_in)
    return access_token, expiry
