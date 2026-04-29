# LLM Wiki Architecture

## Goal

LLM Wiki is a wiki-first knowledge compiler for small-team and personal research workflows.

The system ingests source material, compiles it into durable wiki pages, stores revision history, and answers questions from compiled pages before falling back to generic model behavior.

## Current Scope

Implemented today:

- accept source documents through an API
- queue compilation jobs
- compile documents into wiki pages
- persist wiki pages and revision history
- expose wiki pages for browsing
- answer questions from compiled wiki pages
- provide a lightweight browser console at `/`

Still intentionally simple:

- compile execution is manually triggered
- retrieval is page-first keyword scoring
- evidence is grouped by page with nested source references
- chunking and embeddings are not active yet

## Runtime Shape

- API: Fastify service exposing health, document, wiki, ask, compile, and UI routes
- UI: static browser console served directly by the app from `public/`
- Storage: switchable repository layer using `STORAGE_DRIVER=memory|postgres`
- PostgreSQL: fully implemented for durable storage behind `DATABASE_URL`
- Worker: `POST /jobs/compile` runs a queued compilation pass in-process
- Compiler abstraction: the worker depends on `KnowledgeCompiler`
- Answer abstraction: `POST /ask` depends on `AnswerSynthesizer`
- LLM abstraction: `LanguageModelClient` isolates model-provider specifics behind an OpenAI-compatible interface

## Storage Modes

### Memory mode

Used for the fastest local development loop.

- all documents, jobs, pages, revisions, and links live in process memory
- restarting the app clears all state

### PostgreSQL mode

Used for persistence.

- documents, jobs, pages, revisions, and links are stored in PostgreSQL
- the schema lives in `db/sql/001_init.sql`
- the runtime implementation lives in `src/repositories/postgres.ts`

## Data Model

### Implemented tables and records

- `documents`: source records plus lifecycle state
- `wiki_pages`: current canonical wiki state
- `wiki_page_revisions`: immutable page history
- `wiki_links`: relationships between pages
- `jobs`: async pipeline tracking

### Planned but not active yet

- `document_chunks`: schema exists, but the app does not currently parse documents into chunks or store embeddings during ingestion

## Main Components

- `src/server.ts`: process entrypoint
- `src/app.ts`: application composition
- `src/routes/*`: HTTP routes
- `src/services/ingestion-service.ts`: document creation and requeue logic
- `src/worker/compiler.ts`: queued compile execution
- `src/services/wiki-service.ts`: page upsert, revisions, and link synchronization
- `src/services/ask-service.ts`: page recall and answer orchestration
- `src/services/knowledge-compiler.ts`: placeholder and LLM-backed compilation
- `src/services/answer-synthesizer.ts`: placeholder and LLM-backed answering
- `src/repositories/*`: memory and PostgreSQL persistence
- `public/*`: browser console assets

## Request Flow

### Document ingestion and compilation

1. `POST /documents` stores a source record and enqueues a `compile-document` job.
2. `POST /jobs/compile` runs the compiler once in the current process.
3. The worker reads queued jobs, marks the document as processing, and calls `KnowledgeCompiler.compile(...)`.
4. In live mode, the compiler asks the configured LLM for structured JSON containing:
   - `summary`
   - `pageType`
   - `bodyMarkdown`
   - `sourceRefs`
   - `outboundLinks`
5. `WikiService` creates or updates the page, writes a revision entry, and syncs link relationships.
6. The document is marked as compiled and the job is marked as completed.

### Wiki browsing

1. `GET /wiki` returns the current compiled pages.
2. `GET /wiki/:slug` returns a page plus its revision history.
3. `POST /documents/:id/recompile` requeues a document.
4. `POST /wiki/:slug/recompile` finds the source document for a page and requeues it.

### Question answering

1. `POST /ask` validates the incoming question.
2. `AskService` loads compiled wiki pages and scores them with a lightweight token-based matcher.
3. The top matching pages become `supportingPages`.
4. `AnswerSynthesizer` produces the answer:
   - placeholder mode returns a simple scaffolded response
   - live mode sends the selected wiki pages to the configured LLM
5. The response includes:
   - `answer`
   - `evidence`
   - `supportingPages`

Important limitation:

- the current `evidence` model is page-level, not claim-level
- nested `sourceRefs` provide finer excerpts inside each page
- there is no raw-source fallback path in the current ask implementation when no compiled pages match

## Browser Console

The browser console at `/` is a thin client over the same backend APIs.

It currently provides:

- document submission
- compile triggering
- wiki page browsing
- question asking
- page detail viewing in a right-side drawer

This UI does not add separate backend state or orchestration. It only calls the existing API routes.

## LLM Behavior

### Compilation

- placeholder mode builds a simple markdown page from the source text
- live mode asks the model for structured wiki-page output
- resilient mode falls back to the placeholder compiler on live-model failure

### Answer synthesis

- placeholder mode returns a minimal answer scaffold
- live mode synthesizes an answer from matched wiki pages
- resilient mode falls back to the placeholder answer synthesizer on live-model failure

## What Is Not Implemented Yet

- source parsing per type beyond treating input as provided text
- active `document_chunks` ingestion and retrieval
- embeddings and vector search
- `pgvector` storage
- persistent background workers
- claim-level evidence attribution
- raw-source fallback answering when no compiled pages match

## Next Implementation Steps

- add source parsing per type: markdown, html, pdf
- activate chunking and embeddings
- upgrade `document_chunks.embedding` from JSON to `pgvector` once the extension is available
- improve retrieval beyond page-first keyword scoring
- upgrade evidence from page-level grouping to excerpt or claim-level attribution
- replace manual compile triggering with a persistent queue worker
- add richer provenance and citation handling
