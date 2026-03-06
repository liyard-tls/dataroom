#!/bin/sh
set -e

# Apply any pending migrations (migrations/ folder is committed to the repo)
flask --app run:app db upgrade

# Start the Flask server
exec python run.py
