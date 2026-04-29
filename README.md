# LLM Wiki

An MVP scaffold for a wiki-first knowledge compiler. The first version focuses on four flows:

1. Accept source documents.
2. Queue compilation work.
3. Persist wiki pages and revisions.
4. Answer questions from compiled wiki pages first.

## Architecture

- `src/server.ts`: process entrypoint
- `src/app.ts`: Fastify app composition
- `src/routes/*`: HTTP routes
- `src/domain/*`: core types
- `src/repositories/*`: storage abstractions and in-memory MVP store
- `src/services/*`: ingestion, wiki, and ask orchestration
- `src/worker/*`: background compilation loop
- `db/sql/*`: target PostgreSQL schema for the production datastore

## Run

```bash
npm install
npm run dev
```

Use `STORAGE_DRIVER=memory` for the in-memory MVP. Set `STORAGE_DRIVER=postgres` plus `DATABASE_URL` to switch to the PostgreSQL repositories.
Use `LLM_PROVIDER=placeholder` for offline scaffolding. Set `LLM_PROVIDER=openai-compatible`, `LLM_API_KEY`, `LLM_BASE_URL`, and `LLM_MODEL` to enable live compilation through an OpenAI-compatible chat completions endpoint.
The same model configuration is reused for wiki-first answer synthesis in `POST /ask`.
If the live model request fails, the app falls back to the placeholder compiler and placeholder answer synthesizer instead of failing the request.

For existing content, you can enqueue a fresh compilation pass with:

```bash
POST /documents/:id/recompile
POST /wiki/:slug/recompile
```

`POST /ask` returns the synthesized answer plus an explicit `evidence` array with page titles, slugs, and structured source references.

## PostgreSQL

This repo now includes a plain PostgreSQL migration path:

```bash
npm run db:migrate
```

If PostgreSQL is not installed yet on macOS with Homebrew:

```bash
brew install postgresql@16
brew services start postgresql@16
createdb llm_wiki
```

Then set:

```env
STORAGE_DRIVER=postgres
DATABASE_URL=postgres://localhost:5432/llm_wiki
```

## Current status

This scaffold defaults to an in-memory store so the core API shape is usable immediately. The SQL schema in `db/sql/001_init.sql` and the PostgreSQL repositories in `src/repositories/postgres.ts` are the next storage target for a durable deployment.
