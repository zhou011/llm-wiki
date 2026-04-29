# LLM Wiki MVP Architecture

## Goal

Build a wiki-first knowledge compiler for small-team and personal research workflows. The system should ingest source material, compile it into durable wiki pages, and answer questions from compiled pages before falling back to raw source text.

## MVP scope

- Accept source documents through an API.
- Queue background compilation jobs.
- Create and revise wiki pages from document content.
- Expose wiki pages for browsing.
- Answer questions from compiled wiki pages.

## Runtime shape

- API: Fastify service that exposes ingestion, wiki, ask, and manual compile endpoints.
- Storage today: in-memory repositories for fast prototyping.
- Storage target: PostgreSQL for durable storage, with a future optional upgrade to `pgvector` for embeddings.
- Storage switching: `STORAGE_DRIVER=memory|postgres`, with `DATABASE_URL` required for PostgreSQL mode.
- Worker: a background compiler that consumes queued jobs and writes wiki pages plus revision history.
- Compiler abstraction: the worker depends on a `KnowledgeCompiler` interface so a placeholder summarizer can later be replaced with an LLM-backed compiler.
- LLM abstraction: `LanguageModelClient` isolates the app from any specific model vendor as long as the endpoint supports an OpenAI-style chat completions API.

## Data model

- `documents`: source records and compilation lifecycle state.
- `document_chunks`: parsed source chunks and future embeddings.
- `wiki_pages`: current canonical page state.
- `wiki_page_revisions`: immutable page history.
- `wiki_links`: graph edges between pages.
- `jobs`: async pipeline tracking.

## Request flow

1. `POST /documents` stores a source record and enqueues a `compile-document` job.
2. `POST /jobs/compile` runs the compiler once in the current process.
3. The compiler reads queued jobs, marks the document as processing, then generates a structured page draft.
   In live mode the compiler builds a structured prompt and expects JSON with `summary`, `pageType`, `bodyMarkdown`, `sourceRefs`, and `outboundLinks`.
4. The wiki service creates or updates the page and writes a revision entry.
5. `GET /wiki` and `GET /wiki/:slug` expose compiled pages and history.
6. `POST /ask` searches compiled pages first and either returns a placeholder summary or sends the matched pages to the configured language model for answer synthesis.

## Next implementation steps

- Replace the in-memory repositories with PostgreSQL-backed implementations.
- Add source parsing per type: markdown, html, pdf.
- Add chunking plus embeddings.
- Upgrade `document_chunks.embedding` from JSON to `pgvector` once the runtime environment has the extension installed.
- Add a real LLM orchestration layer for extraction, summarization, and page linking.
- Replace manual compile triggering with a persistent queue worker.
- Add source citations and claim-level provenance.
- Persist `sourceRefs` and `outboundLinks` beyond the in-memory draft so the compiler output becomes first-class queryable data.
