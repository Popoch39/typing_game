.PHONY: install up down build dev dev-ws logs ps migrate generate studio clean db-push test-db test test-api test-frontend test-ws bench-ws

# Install all dependencies (local + rebuild containers)
install:
	bun install

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

# Show logs (all services)
logs:
	docker compose logs -f

# Show logs for a specific service (usage: make logs-api, make logs-frontend, make logs-postgres)
logs-%:
	docker compose logs -f $*

# Show running services
ps:
	docker compose ps

# Run database migrations
migrate:
	docker compose exec api bun run db:migrate

# Generate migration from schema changes
generate:
	docker compose exec api bun run db:generate

# Push schema directly to database (no migration file)
db-push:
	docker compose exec api bunx drizzle-kit push

# Run WS server locally (not in Docker)
dev-ws:
	cd apps/ws && DATABASE_URL=postgres://postgres:postgres@localhost:5433/typing_game bun --watch src/index.ts

# Open Drizzle Studio
studio:
	cd apps/api && DATABASE_URL=postgres://postgres:postgres@localhost:5433/typing_game bun run db:studio

# Restart a specific service (usage: make restart-api)
restart-%:
	docker compose restart $*

# Create test database
test-db:
	docker compose exec postgres psql -U postgres -c "SELECT 1 FROM pg_database WHERE datname = 'typing_game_test'" | grep -q 1 || \
	docker compose exec postgres psql -U postgres -c "CREATE DATABASE typing_game_test"

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
