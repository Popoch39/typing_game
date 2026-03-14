.PHONY: install dev dev-stop up down build logs ps migrate generate studio clean db-push test-db test test-api test-frontend test-ws bench-ws

# Install all dependencies
install:
	bun install

# ──────────────────────────────────────────────
# Local dev (Postgres in Docker, apps on host)
# ──────────────────────────────────────────────

# Start Postgres + all apps locally
dev:
	docker compose -f docker-compose.dev.yml up -d --wait
	bun run dev

# Stop Postgres
dev-stop:
	docker compose -f docker-compose.dev.yml down

# ──────────────────────────────────────────────
# Full Docker stack (all services containerized)
# ──────────────────────────────────────────────

# Start all services
up:
	docker compose up

# Start all services with rebuild
build:
	docker compose up -d --build

# Stop all services
down:
	docker compose down

# Stop and remove volumes
clean:
	docker compose down -v
	docker compose -f docker-compose.dev.yml down -v

# Show logs (all services)
logs:
	docker compose logs -f

# Show logs for a specific service (usage: make logs-api, make logs-frontend, make logs-postgres)
logs-%:
	docker compose logs -f $*

# Show running services
ps:
	docker compose ps

# Restart a specific service (usage: make restart-api)
restart-%:
	docker compose restart $*

# ──────────────────────────────────────────────
# Database
# ──────────────────────────────────────────────

# Run database migrations
migrate:
	cd apps/api && bun run db:migrate

# Generate migration from schema changes
generate:
	cd apps/api && bun run db:generate

# Push schema directly to database (no migration file)
db-push:
	cd apps/api && bunx drizzle-kit push

# Open Drizzle Studio
studio:
	cd apps/api && bun run db:studio

# Create test database
test-db:
	docker compose -f docker-compose.dev.yml exec postgres psql -U postgres -c "SELECT 1 FROM pg_database WHERE datname = 'typing_game_test'" | grep -q 1 || \
	docker compose -f docker-compose.dev.yml exec postgres psql -U postgres -c "CREATE DATABASE typing_game_test"

# ──────────────────────────────────────────────
# Tests
# ──────────────────────────────────────────────

# Run all tests
test: test-api test-frontend test-ws

# Run API tests
test-api:
	cd apps/api && bun test --preload ./src/test/setup.ts

# Run frontend tests
test-frontend:
	cd apps/frontend && bunx vitest run

# Run WS tests
test-ws:
	cd apps/ws && bun test

# Stress test WS (internal, no server needed)
bench-ws:
	cd apps/ws && bun run src/bench/stress.ts --keystrokes 100000
