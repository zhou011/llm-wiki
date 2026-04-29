# LLM Wiki

A wiki-first knowledge compiler for small-team and personal research workflows.

LLM Wiki ingests source material, compiles it into durable wiki pages, stores revision history, and answers questions from compiled knowledge before falling back to generic model behavior.

## What It Does

- Accepts source documents through an API
- Queues compilation jobs
- Compiles documents into wiki pages with summaries, source references, and related links
- Stores page revision history
- Answers questions from compiled wiki pages
- Ships with a lightweight browser console at `/`

## Stack

- TypeScript
- Fastify
- Zod
- PostgreSQL or in-memory storage
- OpenAI-compatible LLM endpoints or a local placeholder mode

## Project Layout

- `src/server.ts`: process entrypoint
- `src/app.ts`: Fastify app composition
- `src/routes/*`: API routes and the console entry route
- `src/services/*`: ingestion, compilation, wiki, and ask orchestration
- `src/repositories/*`: in-memory and PostgreSQL persistence layers
- `src/worker/*`: queued compilation worker
- `public/*`: browser console UI
- `db/sql/*`: PostgreSQL schema
- `docs/architecture.md`: MVP architecture notes

## Quick Start

1. Install dependencies:

```bash
npm install
```

2. Copy the example environment file:

```bash
cp .env.example .env
```

3. Start the app:

```bash
npm run dev
```

4. Open the browser console:

```text
http://localhost:3000/
```

## Environment

### Fastest local setup

Use the default placeholder mode with in-memory storage:

```env
STORAGE_DRIVER=memory
LLM_PROVIDER=placeholder
```

This is the easiest way to try the full document -> compile -> wiki -> ask flow without any external services.

### PostgreSQL mode

To persist documents, jobs, and wiki pages:

```env
STORAGE_DRIVER=postgres
DATABASE_URL=postgres://localhost:5432/llm_wiki
```

Run the migration:

```bash
npm run db:migrate
```

If PostgreSQL is not installed yet on macOS with Homebrew:

```bash
brew install postgresql@16
brew services start postgresql@16
createdb llm_wiki
```

### Live LLM mode

To use an OpenAI-compatible endpoint for compilation and answer synthesis:

```env
LLM_PROVIDER=openai-compatible
LLM_BASE_URL=https://api.openai.com/v1
LLM_API_KEY=your_api_key
LLM_MODEL=gpt-4.1-mini
```

If the live model call fails, the app falls back to the placeholder compiler and placeholder answer synthesizer.

## API Flow

### 1. Create a document

```bash
curl -X POST http://localhost:3000/documents \
  -H "Content-Type: application/json" \
  -d '{
    "sourceType": "text",
    "title": "Redis Notes",
    "rawContent": "Redis is an in-memory data store used for caching and queues."
  }'
```

### 2. Run compilation

```bash
curl -X POST http://localhost:3000/jobs/compile
```

### 3. Browse wiki pages

```bash
curl http://localhost:3000/wiki
curl http://localhost:3000/wiki/redis-notes
```

### 4. Ask a question

```bash
curl -X POST http://localhost:3000/ask \
  -H "Content-Type: application/json" \
  -d '{
    "question": "What is Redis used for?"
  }'
```

## Main Endpoints

- `GET /`: browser console
- `GET /health`: service and model status
- `GET /documents`: list ingested documents
- `POST /documents`: create a document and queue compilation
- `POST /documents/:id/recompile`: queue recompilation for a document
- `POST /jobs/compile`: process queued compile jobs once
- `GET /wiki`: list compiled wiki pages
- `GET /wiki/:slug`: fetch a wiki page and its revisions
- `POST /wiki/:slug/recompile`: recompile the source document behind a page
- `POST /ask`: answer a question from compiled wiki pages

## Browser Console

The built-in console at `/` provides:

- document submission
- manual compile control
- wiki page browsing
- question answering
- page detail viewing in a right-side drawer

This UI is intentionally lightweight and talks directly to the same backend APIs listed above.

## Current Status

Implemented today:

- in-memory storage
- PostgreSQL storage
- queued compile jobs
- wiki page persistence
- wiki revision history
- related page links
- browser console UI
- OpenAI-compatible LLM integration

Still intentionally simple:

- question retrieval is page-first keyword scoring, not vector search
- compilation runs through a manual trigger instead of a persistent background worker
- `document_chunks` exists in schema planning, but chunking and embeddings are not active yet
- evidence is returned at the excerpt or source-reference level, not full claim-level attribution

## Checks

```bash
npm run check
npm run build
```

## Architecture Notes

See [docs/architecture.md](docs/architecture.md) for the MVP architecture and the remaining planned steps.
