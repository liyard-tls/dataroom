import os
from flask import Flask
from .config import config
from .extensions import db, migrate, cors


def create_app(env: str | None = None) -> Flask:
    env = env or os.environ.get("FLASK_ENV", "default")
    app = Flask(__name__)
    app.config.from_object(config[env])

    # Ensure upload directory exists
    os.makedirs(app.config["UPLOAD_DIR"], exist_ok=True)

    # Extensions
    db.init_app(app)
    migrate.init_app(app, db)
    frontend_url = app.config["FRONTEND_URL"]
    cors.init_app(
        app,
        resources={
            # Public share endpoints — allow any origin, no credentials
            r"/public/*": {"origins": "*"},
            # All other endpoints — locked to the frontend origin with credentials
            r"/*": {
                "origins": frontend_url,
                "supports_credentials": True,
                # Allow the Authorization header so Bearer tokens pass CORS preflight
                "allow_headers": ["Content-Type", "Authorization", "X-Owner-ID"],
                "expose_headers": ["Content-Disposition"],
            },
        },
    )

    # Register blueprints
    from .routes.oauth import oauth_bp
    from .routes.files import files_bp
    from .routes.folders import folders_bp
    from .routes.gdrive import gdrive_bp
    from .routes.search import search_bp
    from .routes.shares import shares_bp
    from .routes.public import public_bp

    app.register_blueprint(oauth_bp, url_prefix="/oauth")
    app.register_blueprint(files_bp, url_prefix="/files")
    app.register_blueprint(folders_bp, url_prefix="/folders")
    app.register_blueprint(gdrive_bp, url_prefix="/gdrive")
    app.register_blueprint(search_bp, url_prefix="/search")
    app.register_blueprint(shares_bp, url_prefix="/shares")
    app.register_blueprint(public_bp, url_prefix="/public")

    @app.get("/health")
    def health():
        return {"status": "ok"}

    return app
