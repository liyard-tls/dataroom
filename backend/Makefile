.PHONY: help up down build logs shell db-shell migrate reset fernet

help:
	@echo "Usage: make <target>"
	@echo ""
	@echo "  up         Start all services (build if needed)"
	@echo "  down       Stop and remove containers"
	@echo "  build      Rebuild the api image"
	@echo "  logs       Follow logs from all services"
	@echo "  shell      Open a shell inside the api container"
	@echo "  db-shell   Open psql inside the db container"
	@echo "  migrate    Generate + apply migrations (local Python)"
	@echo "  reset      Drop volumes and restart from scratch"
	@echo "  fernet     Generate a new Fernet key"

up:
	docker compose up --build -d

down:
	docker compose down

build:
	docker compose build api

logs:
	docker compose logs -f

shell:
	docker compose exec api sh

db-shell:
	docker compose exec db psql -U postgres -d dataroom

migrate:
	flask --app run:app db migrate -m "$(msg)"
	flask --app run:app db upgrade

reset:
	docker compose down -v
	docker compose up --build -d

fernet:
	@python3 -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
