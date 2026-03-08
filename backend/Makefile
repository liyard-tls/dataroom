.PHONY: help up down build logs logs-api shell db-shell migrate restart restart-api reset fernet

help:
	@echo "Usage: make <target>"
	@echo ""
	@echo "  up           Start all services (build if needed)"
	@echo "  down         Stop and remove containers"
	@echo "  build        Rebuild the api image"
	@echo "  logs         Follow logs from all services"
	@echo "  logs-api     Follow logs from api only"
	@echo "  shell        Open a shell inside the api container"
	@echo "  db-shell     Open psql inside the db container"
	@echo "  migrate      Generate new migration inside container: make migrate msg=\"add users\""
	@echo "  restart      Rebuild and restart api (no data loss)"
	@echo "  restart-api  Restart api container without rebuild"
	@echo "  reset        Drop volumes and restart from scratch (data loss!)"
	@echo "  fernet       Generate a new Fernet key"

up:
	docker compose up --build -d

down:
	docker compose down

restart:
	docker compose build api
	docker compose up -d --no-deps api

build:
	docker compose build api

logs:
	docker compose logs -f

logs-api:
	docker compose logs -f api

shell:
	docker compose exec api sh

db-shell:
	docker compose exec db psql -U postgres -d dataroom

# Generate a new migration inside the running api container, then apply it.
# Usage: make migrate msg="describe your change"
migrate:
	docker compose exec api flask --app run:app db migrate -m "$(msg)"
	docker compose exec api flask --app run:app db upgrade

restart:
	docker compose build api
	docker compose up -d --no-deps api

restart-api:
	docker compose restart api

reset:
	docker compose down -v
	docker compose up --build -d

fernet:
	@python3 -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
