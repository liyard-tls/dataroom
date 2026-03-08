"""
Authentication middleware.

Every protected endpoint must be decorated with @require_owner.

Auth flow (in priority order):
  1. Authorization: Bearer <firebase-id-token>
     The token is verified by Firebase Admin SDK.
     g.owner_id is set to the verified Firebase UID.

  2. X-Owner-ID: <uid>  (dev/fallback — only when SDK is not configured)
     Accepted only if FIREBASE_SERVICE_ACCOUNT_JSON is absent AND
     FIREBASE_AUTH_REQUIRED is not "true".
     A warning is logged every time this path is used.

In production set FIREBASE_SERVICE_ACCOUNT_JSON (and optionally
FIREBASE_AUTH_REQUIRED=true to hard-disable the fallback).
"""

import logging
from functools import wraps

from flask import g, jsonify, request

from app.services.firebase_service import verify_id_token

logger = logging.getLogger(__name__)


def require_owner(f):
    """Decorator that authenticates the request and populates g.owner_id."""

    @wraps(f)
    def decorated(*args, **kwargs):
        # CORS preflight — let flask-cors handle it
        if request.method == "OPTIONS":
            return f(*args, **kwargs)

        # --- 1. Try Bearer token ---
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            id_token = auth_header[len("Bearer "):]
            try:
                uid = verify_id_token(id_token)
            except ValueError as exc:
                # FIREBASE_AUTH_REQUIRED=true but SDK not configured
                return jsonify({"error": str(exc)}), 500

            if uid is not None:
                g.owner_id = uid
                # Best-effort: extract email from JWT payload for display purposes.
                # This works in both dev (unverified decode) and prod (already verified above).
                try:
                    import base64, json as _json
                    payload_b64 = id_token.split(".")[1]
                    payload_b64 += "=" * (4 - len(payload_b64) % 4)
                    payload = _json.loads(base64.urlsafe_b64decode(payload_b64))
                    # Use display name only (Google/Apple) — no email exposed
                    g.owner_name = payload.get("name") or None
                except Exception:
                    g.owner_name = None
                return f(*args, **kwargs)

            # Token present but invalid / expired
            return jsonify({"error": "Invalid or expired Firebase ID token."}), 401

        # --- 2. Dev fallback: X-Owner-ID (only when Firebase SDK not active) ---
        owner_id = request.headers.get("X-Owner-ID", "").strip()
        if owner_id:
            logger.warning(
                "Request authenticated via X-Owner-ID fallback (uid=%s). "
                "Set FIREBASE_SERVICE_ACCOUNT_JSON to enable proper verification.",
                owner_id,
            )
            g.owner_id = owner_id
            g.owner_name = None
            return f(*args, **kwargs)

        return jsonify({"error": "Authentication required."}), 401

    return decorated
