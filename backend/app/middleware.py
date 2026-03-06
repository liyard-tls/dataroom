"""
Owner ID middleware.

The frontend sends the current user's ID in the X-Owner-ID header.
In the MVP this header is trusted as-is (Firebase UID from the client).
For production you would verify a Firebase ID token instead.
"""
from functools import wraps
from flask import request, jsonify, g


def require_owner(f):
    """Decorator that extracts and validates X-Owner-ID header."""
    @wraps(f)
    def decorated(*args, **kwargs):
        owner_id = request.headers.get("X-Owner-ID", "").strip()
        if not owner_id:
            return jsonify({"error": "X-Owner-ID header is required"}), 401
        g.owner_id = owner_id
        return f(*args, **kwargs)
    return decorated
