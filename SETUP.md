# Say IT — Local Setup Guide

## Prerequisites

| Software | Status | Install |
|----------|--------|---------|
| Node.js 20+ | Required | https://nodejs.org |
| pnpm | Required | `npm install -g pnpm` |
| Docker Desktop | Required | https://www.docker.com/products/docker-desktop/ |
| Git | Required | https://git-scm.com |
| Ollama | Phase 4 (AI) | https://ollama.com |

## Ollama models (for RAG)

```bash
ollama pull qwen3.5:latest
ollama pull nomic-embed-text
```

Verify:

```bash
curl http://localhost:11434/api/generate -d "{\"model\":\"qwen3.5:latest\",\"prompt\":\"hi\",\"stream\":false,\"think\":false}"
curl http://localhost:11434/api/embeddings -d "{\"model\":\"nomic-embed-text\",\"prompt\":\"test\"}"
```

**Note:** Postgres runs on port **5433** (not 5432) to avoid conflicts with a local PostgreSQL install.

## Quick start

```bash
# 1. Copy environment file
cp .env.example .env

# 2. Start infrastructure
docker compose up -d

# 3. Install dependencies
pnpm install

# 4. Run database migrations and seed
pnpm db:migrate
pnpm db:seed

# 5. Start dev servers
pnpm dev
```

- Frontend: http://localhost:5173
- Backend API: http://localhost:3000
- MinIO Console: http://localhost:9001 (minioadmin / minioadmin)
- Default login: `admin@sayit.local` / `Admin123!`
