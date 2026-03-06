#!/bin/sh
set -e

# Initialize migrations folder if it doesn't exist (first-time setup in container)
if [ ! -d "migrations" ]; then
  flask --app run:app db init
  flask --app run:app db migrate -m "initial"
fi

# Apply any pending migrations
flask --app run:app db upgrade

# Start the Flask server
exec python run.py
