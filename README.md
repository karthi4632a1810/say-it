# Say IT

Self-hosted enterprise internal communication and collaboration platform with Ollama-powered RAG search.

## Quick start

See [SETUP.md](SETUP.md) for full prerequisites and Ollama configuration.

```bash
cp .env.example .env
docker compose up -d
pnpm install
pnpm db:generate
pnpm --filter @say-it/backend db:migrate:dev --name init
pnpm db:seed
pnpm dev
```

- **Frontend:** http://localhost:5173
- **API:** http://localhost:3000
- **Login:** `admin@sayit.local` / `Admin123!`

## Stack

- **Frontend:** React, Vite, MUI, Redux Toolkit, TanStack Query, Socket.IO
- **Backend:** Express, Prisma, PostgreSQL + pgvector, Redis, MinIO, Bull
- **AI:** Ollama (`qwen3.5:latest` + `nomic-embed-text`)

## Architecture

See [PLAN.md](PLAN.md) for the full blueprint.
