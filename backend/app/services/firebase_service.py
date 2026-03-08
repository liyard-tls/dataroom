"""
Firebase Admin SDK initialisation and ID-token verification.

The SDK is initialised once (lazily) using a service account JSON supplied
via the FIREBASE_SERVICE_ACCOUNT_JSON environment variable.  The variable
must contain the **full JSON string** (not a file path).

If the env var is absent the backend starts in development mode without
Firebase verification — X-Owner-ID is still accepted as-is so that local
development without a service account keeps working.  Set
FIREBASE_AUTH_REQUIRED=true to force verification in all environments.
"""

import json
import logging
import os
import threading

import firebase_admin
from firebase_admin import auth as firebase_auth, credentials

logger = logging.getLogger(__name__)

_initialised = False
_init_lock = threading.Lock()


def _init_firebase() -> bool:
    """Initialise Firebase Admin SDK from env var. Returns True if successful."""
    global _initialised
    if _initialised:
        return True

    with _init_lock:
        if _initialised:
            return True

        # Reuse an app initialised elsewhere in the same process.
        try:
            firebase_admin.get_app()
            _initialised = True
            return True
        except ValueError:
            pass

        sa_json = os.environ.get("FIREBASE_SERVICE_ACCOUNT_JSON", "").strip()
        if not sa_json:
            logger.warning(
                "FIREBASE_SERVICE_ACCOUNT_JSON is not set — "
                "Firebase token verification is DISABLED."
            )
            return False

        try:
            sa_dict = json.loads(sa_json)
            cred = credentials.Certificate(sa_dict)
            firebase_admin.initialize_app(cred)
            _initialised = True
            logger.info("Firebase Admin SDK initialised (project: %s)", sa_dict.get("project_id"))
            return True
        except ValueError as exc:
            # Can happen under concurrent first requests; treat as success.
            if "already exists" in str(exc):
                _initialised = True
                logger.info("Firebase Admin SDK already initialised, reusing default app.")
                return True
            logger.error("Failed to initialise Firebase Admin SDK: %s", exc)
            return False
        except Exception as exc:  # noqa: BLE001
            logger.error("Failed to initialise Firebase Admin SDK: %s", exc)
            return False


def verify_id_token(id_token: str) -> str | None:
    """
    Verify a Firebase ID token and return the uid, or None on failure.

    Raises ValueError if FIREBASE_AUTH_REQUIRED=true and SDK is not configured.
    """
    if not _init_firebase():
        if os.environ.get("FIREBASE_AUTH_REQUIRED", "").lower() == "true":
            raise ValueError("Firebase Auth is required but SDK is not configured.")
        # Dev mode: decode JWT payload without cryptographic verification to
        # extract the Firebase UID (sub claim).  This is intentionally insecure
        # — it allows local development without a service account while keeping
        # the same auth flow.  Never set FIREBASE_AUTH_REQUIRED=false in prod.
        try:
            import base64
            import json as _json

            payload_b64 = id_token.split(".")[1]
            # Pad to a multiple of 4 for base64 decoding
            payload_b64 += "=" * (4 - len(payload_b64) % 4)
            payload = _json.loads(base64.urlsafe_b64decode(payload_b64))
            uid = payload.get("sub") or payload.get("user_id")
            if uid:
                logger.warning(
                    "Dev mode: accepted unverified Firebase token for uid=%s", uid
                )
                return uid
        except Exception as exc:  # noqa: BLE001
            logger.warning("Dev mode: failed to decode JWT payload: %s", exc)
        return None

    try:
        decoded = firebase_auth.verify_id_token(id_token, check_revoked=True)
        return decoded["uid"]
    except firebase_auth.RevokedIdTokenError:
        logger.warning("Revoked Firebase ID token presented.")
        return None
    except firebase_auth.ExpiredIdTokenError:
        logger.warning("Expired Firebase ID token presented.")
        return None
    except Exception as exc:  # noqa: BLE001
        logger.warning("Firebase ID token verification failed: %s", exc)
        return None
