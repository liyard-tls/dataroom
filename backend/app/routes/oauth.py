"""
Google Drive OAuth routes.

Flow:
  1. Frontend calls GET /oauth/google-drive/authorize
     → returns { authUrl } for the Google consent screen
  2. User is redirected to Google and authenticates
  3. Google redirects to GET /oauth/google-drive/callback?code=...&state=...
     → backend exchanges code for tokens, stores them, redirects to frontend
"""
from __future__ import annotations

import secrets
from datetime import datetime, timezone, timedelta
from urllib.parse import urlencode

import requests
from flask import Blueprint, current_app, g, jsonify, request, session

from ..middleware import require_owner
from ..services import token_service

oauth_bp = Blueprint("oauth", __name__)

GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"


@oauth_bp.get("/google-drive/authorize")
@require_owner
def authorize():
    """Return the Google OAuth consent-screen URL."""
    state = secrets.token_urlsafe(32)
    # Store state + owner_id in server-side session so callback can verify and identify user
    session["oauth_state"] = state
    session["oauth_owner_id"] = g.owner_id
    session.permanent = True

    params = {
        "client_id": current_app.config["GOOGLE_CLIENT_ID"],
        "redirect_uri": current_app.config["GOOGLE_REDIRECT_URI"],
        "response_type": "code",
        "scope": " ".join(current_app.config["GOOGLE_SCOPES"]),
        "access_type": "offline",
        "prompt": "consent",  # Always ask consent so we get a refresh_token
        "state": state,
    }
    auth_url = f"{GOOGLE_AUTH_URL}?{urlencode(params)}"
    return jsonify({"authUrl": auth_url})


@oauth_bp.get("/google-drive/callback")
def callback():
    """
    Handle Google OAuth callback.
    Exchanges the authorization code for tokens and saves them encrypted.
    Then redirects the user back to the frontend.
    """
    frontend_url = current_app.config["FRONTEND_URL"]

    def popup_response(msg_type: str, payload: dict | None = None):
        """Return an HTML page that posts a message to the opener and closes."""
        import json as _json
        data = _json.dumps({"type": msg_type, **(payload or {})})
        fallback = frontend_url + "/dataroom"
        return f"""<!doctype html>
<html>
<head><meta charset="utf-8"><title>Google Drive</title></head>
<body>
<script>
  if (window.opener) {{
    window.opener.postMessage({data}, {repr(frontend_url)});
    window.close();
  }} else {{
    window.location.href = {repr(fallback)};
  }}
</script>
<p>You can close this window.</p>
</body>
</html>"""

    error = request.args.get("error")
    if error:
        return popup_response("gdrive_error", {"error": error})

    code = request.args.get("code")
    state = request.args.get("state")

    # CSRF check
    if not state or state != session.get("oauth_state"):
        return popup_response("gdrive_error", {"error": "state_mismatch"})

    owner_id = session.get("oauth_owner_id")
    if not owner_id:
        return popup_response("gdrive_error", {"error": "missing_owner"})

    # Exchange code for tokens
    resp = requests.post(
        GOOGLE_TOKEN_URL,
        data={
            "code": code,
            "client_id": current_app.config["GOOGLE_CLIENT_ID"],
            "client_secret": current_app.config["GOOGLE_CLIENT_SECRET"],
            "redirect_uri": current_app.config["GOOGLE_REDIRECT_URI"],
            "grant_type": "authorization_code",
        },
        timeout=10,
    )

    if not resp.ok:
        return popup_response("gdrive_error", {"error": "token_exchange_failed"})

    data = resp.json()
    access_token = data["access_token"]
    refresh_token = data.get("refresh_token")
    expires_in = data.get("expires_in", 3600)
    scopes = data.get("scope", "").split(" ")
    expiry = datetime.now(timezone.utc) + timedelta(seconds=expires_in)

    token_service.save_token(
        owner_id=owner_id,
        access_token=access_token,
        refresh_token=refresh_token,
        expiry=expiry,
        scopes=scopes,
    )

    # Clear OAuth session data
    session.pop("oauth_state", None)
    session.pop("oauth_owner_id", None)

    return popup_response("gdrive_connected")


@oauth_bp.get("/google-drive/status")
@require_owner
def status():
    """Check if Google Drive is connected for the current owner."""
    return jsonify(token_service.token_status(g.owner_id))


@oauth_bp.delete("/google-drive/revoke")
@require_owner
def revoke():
    """Disconnect Google Drive — deletes the stored token."""
    token_service.delete_token(g.owner_id)
    return jsonify({"disconnected": True})
