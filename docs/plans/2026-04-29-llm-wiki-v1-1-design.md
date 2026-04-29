# LLM Wiki v1.1 Design

## Goal

Evolve LLM Wiki from a wiki-first question answering MVP into a more faithful implementation of Karpathy's `llm-wiki` model:

- raw sources as the immutable substrate
- wiki pages as the maintained knowledge layer
- schema as explicit knowledge-maintenance rules
- ingest, query, and lint as first-class operations
- high-value queries feeding knowledge back into the wiki

This version is intended to improve answer quality, make knowledge accumulation explicit, and create the first durable feedback loop between user questions and the wiki itself.

## Design Principles

1. `Sources are truth, wiki is interpretation`
   Raw sources stay append-only. Wiki pages are compiled and maintained views over those sources.

2. `Query is not the end of the workflow`
   Good questions and good answers should become future knowledge assets.

3. `Schema must be explicit`
   Page structure, update rules, and write-back behavior should not live only inside prompts.

4. `Lint is a product capability`
   The system should actively detect weak sourcing, stale pages, duplicate topics, and missing pages.

5. `Stay incrementally shippable`
   v1.1 should not require vector retrieval or claim-level provenance to deliver value.

## Current Baseline

The existing system already supports:

- source document ingestion
- queued compilation jobs
- wiki page creation and revision history
- page-first retrieval
- excerpt-level evidence in `/ask`
- a lightweight browser console
- switchable memory or PostgreSQL persistence

The major missing pieces relative to the Karpathy model are:

- explicit schema
- query write-back
- lint workflows
- richer page taxonomy
- source lifecycle semantics

## v1.1 Scope

v1.1 includes:

- explicit schema storage and loading
- query logging and normalization
- write-back candidates from high-value queries
- lint job execution and lint reporting
- richer page taxonomy
- lightweight admin visibility for drafts and lint results

v1.1 does not require:

- embeddings
- vector search
- claim-level provenance
- a persistent external worker

## Architecture

### 1. Raw Sources Layer

The current `documents` concept becomes more explicitly a source ledger.

Each source record should represent an observed unit of source material, not just a transient upload. The source layer remains append-oriented and should preserve enough metadata to support future versioning, re-ingestion, and provenance.

Recommended additions to `documents`:

- `source_uri`: canonical origin when available
- `source_author`: author or publisher if known
- `source_created_at`: original source time
- `source_observed_at`: time we ingested or observed it
- `checksum`: content hash for deduplication and change detection
- `supersedes_document_id`: optional pointer to an older source version
- `tags`: optional lightweight classification

This keeps raw material separate from wiki interpretation and makes future linting and staleness checks possible.

### 2. Wiki Layer

The wiki remains the core compiled knowledge system, but page taxonomy should expand beyond the current `entity | topic | timeline`.

Recommended page types for v1.1:

- `entity`
- `topic`
- `timeline`
- `faq`
- `comparison`
- `concept`
- `index`

Why this matters:

- `faq` captures recurring questions
- `comparison` captures multi-page synthesis
- `concept` supports abstract topics not tied to a single entity
- `index` supports structured navigation for larger themes

This taxonomy aligns better with how users actually ask questions and how compiled knowledge evolves over time.

### 3. Schema Layer

The system needs explicit maintenance rules rather than relying only on prompts and code conventions.

Introduce a schema artifact, for example:

- `config/wiki-schema.md`
or
- `config/wiki-schema.json`

The schema should define:

- allowed page types
- required sections per page type
- title conventions
- source reference requirements
- outbound link expectations
- when to create a new page versus update an existing page
- when a query answer is eligible for write-back
- how contradictions or uncertainty should be represented

The compiler and lint flows should both consume this schema.

## New System Capabilities

### 1. Query Records

Every ask operation should persist a structured query record.

Add a new table:

- `qa_records`

Recommended fields:

- `id`
- `question`
- `normalized_question`
- `answer`
- `evidence` as JSON
- `supporting_page_slugs` as JSON
- `confidence` or `answer_quality`
- `source_mode` such as `compiled-pages-only`
- `created_at`
- `user_feedback` nullable

Purpose:

- audit and debugging
- identifying high-frequency questions
- detecting high-value query patterns
- powering write-back and lint signals

### 2. Query Write-Back Candidates

Not every answer should become wiki content. v1.1 should introduce an intermediate layer of write-back candidates.

Add a new table:

- `knowledge_drafts`

Recommended fields:

- `id`
- `draft_type` such as `faq`, `comparison`, `page-update`
- `status` such as `proposed`, `approved`, `rejected`, `applied`
- `source_query_id`
- `title`
- `target_page_slug` nullable
- `proposed_body_markdown`
- `proposed_summary`
- `proposed_source_refs` as JSON
- `reason`
- `created_at`
- `updated_at`

Generation triggers:

- a normalized question asked multiple times
- answers that repeatedly synthesize the same pages
- comparison-style questions requiring multiple pages
- cases where lint identifies a missing page for recurring demand

This preserves safety and reviewability. The system proposes knowledge accumulation before mutating canonical wiki pages.

### 3. Lint

Lint becomes a formal operation instead of an informal future idea.

Add:

- `lint_reports`
- `lint_findings`

Recommended finding types:

- `orphan-page`
- `weak-sourcing`
- `stale-page`
- `duplicate-topic`
- `high-query-low-coverage`
- `missing-comparison-page`
- `contradictory-summary`

Lint should run as a job similar to compile jobs:

- `POST /jobs/lint`
- optional future scheduled run

The first version can rely on rules and heuristics, not embeddings.

## API Changes

### Existing APIs kept

- `POST /documents`
- `POST /jobs/compile`
- `GET /wiki`
- `GET /wiki/:slug`
- `POST /ask`

### New APIs for v1.1

#### Query records

- `GET /queries`
- `GET /queries/:id`

#### Knowledge drafts

- `GET /drafts`
- `GET /drafts/:id`
- `POST /drafts/:id/apply`
- `POST /drafts/:id/reject`

#### Lint

- `POST /jobs/lint`
- `GET /lint/reports`
- `GET /lint/reports/:id`

#### Schema

- `GET /schema/wiki`
- `PUT /schema/wiki` or file-based reload endpoint if runtime editing is desired later

## Query Flow v1.1

1. User calls `POST /ask`
2. System retrieves and ranks supporting pages
3. System builds excerpt-level evidence
4. System synthesizes the answer using top evidence excerpts plus page context
5. System stores a `qa_record`
6. System evaluates whether this query should produce:
   - no follow-up
   - a lint signal
   - a `knowledge_draft`
7. Response returns answer, evidence, and supporting pages as today

This preserves the user experience while adding a durable knowledge feedback loop.

## Ingest Flow v1.1

1. Source is ingested as a durable raw record
2. A compile job is enqueued
3. The compiler consults schema guidance
4. The wiki page is created or updated
5. Revisions and links are stored
6. Optional lint is triggered after compile in later iterations

## Lint Flow v1.1

1. Lint job loads pages, source metadata, query history, and schema
2. Rules evaluate page health and demand gaps
3. Findings are stored in `lint_reports` and `lint_findings`
4. Some findings may generate recommended `knowledge_drafts`

Example:

- repeated question cluster: "Redis vs PostgreSQL"
- no dedicated comparison page exists
- lint produces `high-query-low-coverage`
- draft generator proposes a `comparison` page candidate

## Browser Console Changes

The current console should evolve modestly, not be rebuilt.

Recommended additions:

- `Queries` panel or tab
- `Drafts` panel
- `Lint` panel

Minimum viable UI behavior:

- view recent questions and answers
- inspect generated drafts
- approve or reject drafts
- inspect latest lint report

This moves the product closer to "knowledge maintenance console" rather than "upload and ask demo."

## Data Model Summary

### Existing

- `documents`
- `wiki_pages`
- `wiki_page_revisions`
- `wiki_links`
- `jobs`

### New in v1.1

- `qa_records`
- `knowledge_drafts`
- `lint_reports`
- `lint_findings`
- optional schema persistence table if schema is not file-backed

## Ranking and Quality Strategy

v1.1 should continue using page-first retrieval plus excerpt-level evidence, but with better policy around knowledge accumulation:

- answer from top excerpts
- log queries
- detect recurring question patterns
- convert recurring, stable answers into proposed wiki content

This keeps the system lightweight while meaningfully improving precision and long-term usefulness.

## Non-Goals

These are explicitly out of scope for v1.1:

- full vector retrieval
- automatic canonical page mutation without review
- sentence-level provenance mapping in final answers
- multi-user permissions and collaboration workflow
- full external crawler or connector ecosystem

## Rollout Plan

### Phase 1: Schema and data model

- add schema artifact
- extend page type support
- add new database tables

### Phase 2: Query persistence

- persist `qa_records`
- normalize question text
- expose query APIs

### Phase 3: Knowledge drafts

- generate draft candidates from selected queries
- expose review and apply flows

### Phase 4: Lint

- add lint job
- store reports and findings
- surface findings in UI

### Phase 5: UI upgrades

- add drafts and lint visibility to the browser console

## Risks

1. `Too much automatic write-back`
   Drafts can become noisy if generation criteria are too loose.

2. `Schema overreach`
   A schema that is too rigid can reduce useful synthesis.

3. `Weak question normalization`
   If normalization is poor, recurring questions will fragment into many near-duplicates.

4. `Lint fatigue`
   Too many weak findings will make the feature easy to ignore.

## Success Criteria

v1.1 is successful if:

- query history becomes inspectable and useful
- repeated question patterns produce meaningful draft knowledge
- lint identifies obvious knowledge coverage and sourcing issues
- users can see the wiki getting better over time because of real questions
- the system feels more like a maintained knowledge base than a stateless RAG app

## Recommended First Implementation Order

1. schema artifact
2. `qa_records`
3. `knowledge_drafts`
4. lint jobs and report storage
5. browser console visibility for drafts and lint

This ordering gives the project the fastest path from "good MVP" to "recognizable llm-wiki system."
