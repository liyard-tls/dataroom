import os
from datetime import timedelta


class Config:
    # Flask
    SECRET_KEY = os.environ.get("SECRET_KEY", "dev-secret-change-in-production")
    DEBUG = False

    # PostgreSQL
    SQLALCHEMY_DATABASE_URI = os.environ.get(
        "DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/dataroom"
    )
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    # File storage
    UPLOAD_DIR = os.environ.get("UPLOAD_DIR", os.path.join(os.path.dirname(__file__), "..", "uploads"))
    MAX_FILE_SIZE = 100 * 1024 * 1024  # 100 MB

    # Token encryption
    FERNET_KEY = os.environ.get("FERNET_KEY")  # Required in production

    # Firebase Admin SDK — full service-account JSON as a single-line string.
    # When set, every request must carry Authorization: Bearer <id-token>.
    # When absent, the legacy X-Owner-ID fallback is used (dev only).
    FIREBASE_SERVICE_ACCOUNT_JSON = os.environ.get("FIREBASE_SERVICE_ACCOUNT_JSON")
    # Set to "true" to reject X-Owner-ID fallback even in development.
    FIREBASE_AUTH_REQUIRED = os.environ.get("FIREBASE_AUTH_REQUIRED", "false")

    # Google OAuth
    GOOGLE_CLIENT_ID = os.environ.get("GOOGLE_CLIENT_ID")
    GOOGLE_CLIENT_SECRET = os.environ.get("GOOGLE_CLIENT_SECRET")
    GOOGLE_REDIRECT_URI = os.environ.get(
        "GOOGLE_REDIRECT_URI", "http://localhost:5001/oauth/google-drive/callback"
    )
    GOOGLE_SCOPES = [
        "https://www.googleapis.com/auth/drive.readonly",
        "openid",
        "email",
        "profile",
    ]

    # CORS — frontend origin
    FRONTEND_URL = os.environ.get("FRONTEND_URL", "http://localhost:3000")

    # Session (used to pass OAuth state between redirect and callback)
    SESSION_COOKIE_SAMESITE = "Lax"
    SESSION_COOKIE_SECURE = False  # Set True in production (HTTPS)
    PERMANENT_SESSION_LIFETIME = timedelta(hours=1)


class DevelopmentConfig(Config):
    DEBUG = True


class ProductionConfig(Config):
    DEBUG = False
    SESSION_COOKIE_SECURE = True


config = {
    "development": DevelopmentConfig,
    "production": ProductionConfig,
    "default": DevelopmentConfig,
}
