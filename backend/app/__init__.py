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
    cors.init_app(
        app,
        resources={r"/*": {"origins": app.config["FRONTEND_URL"]}},
        supports_credentials=True,
    )

    # Register blueprints
    from .routes.oauth import oauth_bp
    from .routes.files import files_bp
    from .routes.folders import folders_bp
    from .routes.gdrive import gdrive_bp
    from .routes.search import search_bp

    app.register_blueprint(oauth_bp, url_prefix="/oauth")
    app.register_blueprint(files_bp, url_prefix="/files")
    app.register_blueprint(folders_bp, url_prefix="/folders")
    app.register_blueprint(gdrive_bp, url_prefix="/gdrive")
    app.register_blueprint(search_bp, url_prefix="/search")

    @app.get("/health")
    def health():
        return {"status": "ok"}

    return app
