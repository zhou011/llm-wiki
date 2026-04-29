# LLM Wiki v1.1 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add the first production-grade Karpathy-aligned capabilities to LLM Wiki: explicit schema, persisted query records, knowledge drafts, and lint workflows.

**Architecture:** Keep the current Fastify + repository architecture, extend the PostgreSQL schema and repository bundle, and add new services and routes without rewriting the existing ingest / compile / ask flow. Build v1.1 as additive slices so each milestone remains runnable and testable.

**Tech Stack:** TypeScript, Fastify, PostgreSQL, Zod, existing repository/service architecture

---

## Delivery Order

Implement in this order:

1. Schema artifact and loading
2. `qa_records`
3. `knowledge_drafts`
4. `lint_reports` and `lint_findings`
5. Browser console visibility for queries, drafts, and lint

Each task below is intended to be completed and verified before moving to the next one.

### Task 1: Add v1.1 schema and database tables

**Files:**
- Create: `config/wiki-schema.json`
- Modify: `db/sql/001_init.sql`
- Modify: `src/domain/types.ts`
- Modify: `src/repositories/interfaces.ts`
- Modify: `src/repositories/postgres.ts`
- Modify: `src/repositories/memory.ts`
- Test: manual migration and type-check validation

**Step 1: Create the schema artifact**

Add `config/wiki-schema.json` with:

- `pageTypes`
- per-page required sections
- `writeBackRules`
- `lintRules`

Keep it small and explicit. Do not over-generalize.

**Step 2: Extend the SQL schema**

Add tables for:

- `qa_records`
- `knowledge_drafts`
- `lint_reports`
- `lint_findings`

Also add any required JSON fields and indexes.

**Step 3: Extend domain types**

In `src/domain/types.ts`, add types for:

- `WikiSchema`
- `QaRecord`
- `KnowledgeDraft`
- `LintReport`
- `LintFinding`

Use narrow string unions for statuses and types.

**Step 4: Extend repository interfaces**

In `src/repositories/interfaces.ts`, add repository contracts for:

- schema access
- query records
- knowledge drafts
- lint reports/findings

Keep existing repository bundle style consistent.

**Step 5: Implement repository support**

Update:

- `src/repositories/postgres.ts`
- `src/repositories/memory.ts`

Add minimal create/list/get/update methods required by later tasks.

**Step 6: Verify**

Run:

```bash
npm run check
npm run build
```

Expected:

- both pass
- migration file remains coherent

**Step 7: Commit**

```bash
git add config/wiki-schema.json db/sql/001_init.sql src/domain/types.ts src/repositories/interfaces.ts src/repositories/postgres.ts src/repositories/memory.ts
git commit -m "Add v1.1 schema and persistence types"
```

### Task 2: Load and expose the wiki schema

**Files:**
- Create: `src/services/schema-service.ts`
- Modify: `src/app.ts`
- Modify: `src/routes/ui.ts` only if needed for static config access
- Create: `src/routes/schema.ts`
- Modify: `src/config.ts` only if a schema path setting is needed
- Test: schema API read path

**Step 1: Add a schema service**

Create `src/services/schema-service.ts` to:

- load `config/wiki-schema.json`
- validate it with Zod
- return typed schema data

Support file-backed loading only for v1.1.

**Step 2: Register schema access in app composition**

Update `src/app.ts` to make schema available to routes and services.

Prefer:

- decorating the Fastify instance
or
- constructing schema service where needed

Choose the lighter option that matches the existing codebase.

**Step 3: Add schema route**

Create `src/routes/schema.ts` with:

- `GET /schema/wiki`

Return the parsed schema artifact.

**Step 4: Register the route**

Wire the route into `src/app.ts`.

**Step 5: Verify**

Run:

```bash
npm run check
npm run build
```

Optional manual verification:

```bash
curl http://localhost:3000/schema/wiki
```

**Step 6: Commit**

```bash
git add src/services/schema-service.ts src/routes/schema.ts src/app.ts src/config.ts
git commit -m "Expose wiki schema through API"
```

### Task 3: Persist query history with `qa_records`

**Files:**
- Create: `src/services/query-service.ts`
- Modify: `src/services/ask-service.ts`
- Modify: `src/routes/ask.ts`
- Create: `src/routes/queries.ts`
- Modify: `src/repositories/interfaces.ts`
- Modify: `src/repositories/postgres.ts`
- Modify: `src/repositories/memory.ts`
- Test: `/ask` side effect and `/queries` retrieval

**Step 1: Add query normalization**

In `src/services/query-service.ts`, implement:

- `normalizeQuestion(question: string): string`

Keep v1.1 simple:

- lowercase
- trim
- collapse whitespace
- do not attempt semantic canonicalization yet

**Step 2: Add query record persistence**

In the same service, add `createRecord(...)` using the new repositories.

Store:

- original question
- normalized question
- answer
- evidence
- supporting page slugs
- `source_mode`
- timestamp

**Step 3: Update ask flow**

Modify `src/services/ask-service.ts` so that after answer synthesis it writes a `qa_record`.

Do not block the user response on extra optional analytics. Keep the persistence path simple and synchronous for now.

**Step 4: Add query routes**

Create `src/routes/queries.ts`:

- `GET /queries`
- `GET /queries/:id`

Keep the first version read-only.

**Step 5: Register routes**

Wire `src/routes/queries.ts` into `src/app.ts`.

**Step 6: Verify**

Run:

```bash
npm run check
npm run build
```

Manual verification:

1. create a document
2. compile it
3. call `/ask`
4. fetch `/queries`

Expected:

- a new query record is stored

**Step 7: Commit**

```bash
git add src/services/query-service.ts src/services/ask-service.ts src/routes/ask.ts src/routes/queries.ts src/repositories/interfaces.ts src/repositories/postgres.ts src/repositories/memory.ts src/app.ts
git commit -m "Persist ask history as query records"
```

### Task 4: Generate and store `knowledge_drafts`

**Files:**
- Create: `src/services/draft-service.ts`
- Modify: `src/services/ask-service.ts`
- Create: `src/routes/drafts.ts`
- Modify: `src/repositories/interfaces.ts`
- Modify: `src/repositories/postgres.ts`
- Modify: `src/repositories/memory.ts`
- Test: repeated queries and draft creation

**Step 1: Define simple draft heuristics**

In `src/services/draft-service.ts`, implement v1.1 heuristics such as:

- if normalized question appears at least N times, propose `faq`
- if supporting pages count >= 2, propose `comparison`

Pick conservative defaults. Start with N = 2 or 3.

**Step 2: Add draft generation service**

Implement methods to:

- inspect recent `qa_records`
- create `knowledge_draft` records
- avoid obvious duplicates

**Step 3: Hook into ask flow**

After persisting a `qa_record`, call draft generation.

Do not auto-apply drafts in v1.1.

**Step 4: Add draft routes**

Create `src/routes/drafts.ts`:

- `GET /drafts`
- `GET /drafts/:id`
- `POST /drafts/:id/reject`
- `POST /drafts/:id/apply`

For `apply`, start with one supported flow:

- create or update a wiki page from the draft

Keep the implementation narrow and explicit.

**Step 5: Register routes**

Wire `src/routes/drafts.ts` into `src/app.ts`.

**Step 6: Verify**

Run:

```bash
npm run check
npm run build
```

Manual verification:

- ask the same normalized question multiple times
- inspect `/drafts`

Expected:

- draft proposal appears once
- duplicates are not created repeatedly

**Step 7: Commit**

```bash
git add src/services/draft-service.ts src/services/ask-service.ts src/routes/drafts.ts src/repositories/interfaces.ts src/repositories/postgres.ts src/repositories/memory.ts src/app.ts
git commit -m "Add knowledge draft generation and review APIs"
```

### Task 5: Add lint reports and lint job execution

**Files:**
- Create: `src/services/lint-service.ts`
- Create: `src/routes/lint.ts`
- Modify: `src/routes/jobs.ts`
- Modify: `src/repositories/interfaces.ts`
- Modify: `src/repositories/postgres.ts`
- Modify: `src/repositories/memory.ts`
- Test: lint report generation

**Step 1: Implement lint rules**

In `src/services/lint-service.ts`, implement conservative heuristics for:

- orphan pages
- weak sourcing
- high-query-low-coverage
- duplicate-topic candidates

Do not attempt contradiction detection in the first pass unless it is trivially implementable.

**Step 2: Add lint report persistence**

Use `lint_reports` and `lint_findings` to store:

- run metadata
- finding type
- target page or query context
- severity
- message

**Step 3: Add lint job route**

In `src/routes/jobs.ts`, add:

- `POST /jobs/lint`

Keep this parallel to the existing compile execution style.

**Step 4: Add lint read routes**

Create `src/routes/lint.ts`:

- `GET /lint/reports`
- `GET /lint/reports/:id`

**Step 5: Register routes**

Wire the lint routes into `src/app.ts`.

**Step 6: Verify**

Run:

```bash
npm run check
npm run build
```

Manual verification:

- run lint
- inspect reports and findings

**Step 7: Commit**

```bash
git add src/services/lint-service.ts src/routes/lint.ts src/routes/jobs.ts src/repositories/interfaces.ts src/repositories/postgres.ts src/repositories/memory.ts src/app.ts
git commit -m "Add lint jobs and report APIs"
```

### Task 6: Extend the browser console for v1.1 visibility

**Files:**
- Modify: `public/index.html`
- Modify: `public/styles.css`
- Modify: `public/app.js`
- Test: manual browser verification

**Step 1: Add lightweight navigation or panels**

Add UI surfaces for:

- recent queries
- drafts
- lint reports

Do not rebuild the whole console. Extend the existing layout.

**Step 2: Add query list rendering**

Use:

- `GET /queries`

Show:

- normalized or original question
- answer preview
- created time

**Step 3: Add draft list rendering**

Use:

- `GET /drafts`

Show:

- draft type
- title
- status
- reason

Add buttons for:

- apply
- reject

**Step 4: Add lint report rendering**

Use:

- `GET /lint/reports`

Show:

- report timestamp
- finding counts
- drill-down into findings

**Step 5: Add minimal refresh logic**

Integrate these surfaces into the existing refresh lifecycle.

Keep local state management simple and imperative, consistent with the current frontend.

**Step 6: Verify**

Run:

```bash
npm run check
npm run build
```

Manual verification in browser:

- ask a question
- confirm it appears in queries
- trigger repeated questions
- confirm drafts appear
- run lint
- confirm lint report appears

**Step 7: Commit**

```bash
git add public/index.html public/styles.css public/app.js
git commit -m "Expose queries drafts and lint in the console"
```

### Task 7: Update docs to match v1.1

**Files:**
- Modify: `README.md`
- Modify: `docs/architecture.md`
- Modify: `docs/plans/2026-04-29-llm-wiki-v1-1-design.md` only if implementation scope changed

**Step 1: Update README**

Document:

- schema route
- query records
- drafts
- lint
- console capabilities

**Step 2: Update architecture**

Reflect:

- new data model
- ask flow
- query write-back
- lint operations

**Step 3: Verify**

Read the docs end-to-end and ensure the public description matches the actual implementation.

**Step 4: Commit**

```bash
git add README.md docs/architecture.md docs/plans/2026-04-29-llm-wiki-v1-1-design.md
git commit -m "Document v1.1 knowledge workflows"
```

## Final Verification Checklist

Run:

```bash
npm run check
npm run build
```

Manual API walkthrough:

1. `POST /documents`
2. `POST /jobs/compile`
3. `POST /ask`
4. `GET /queries`
5. `GET /drafts`
6. `POST /jobs/lint`
7. `GET /lint/reports`
8. Open `/` and verify the UI surfaces

Expected outcomes:

- question answering still works
- query history persists
- high-value questions create drafts
- lint reports persist and render
- no existing core flow regresses

## Notes for Execution

- Keep each task shippable
- Prefer additive changes over refactors
- Do not mix vector-search work into this plan
- Keep draft generation conservative
- Keep lint initially heuristic and explainable

Plan complete and saved to `docs/plans/2026-04-29-llm-wiki-v1-1-implementation-plan.md`. Two execution options:

**1. Subagent-Driven (this session)** - I dispatch fresh subagent per task, review between tasks, fast iteration

**2. Parallel Session (separate)** - Open new session with executing-plans, batch execution with checkpoints

Which approach?
