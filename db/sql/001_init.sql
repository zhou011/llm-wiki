-- This MVP schema is intentionally compatible with a plain PostgreSQL install.
-- If you later add pgvector, you can migrate document_chunks.embedding to vector(1536).

create table if not exists documents (
  id text primary key,
  source_type text not null,
  title text not null,
  raw_content text not null,
  metadata jsonb not null default '{}'::jsonb,
  status text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists document_chunks (
  id text primary key,
  document_id text not null references documents(id) on delete cascade,
  chunk_index integer not null,
  content text not null,
  embedding jsonb,
  created_at timestamptz not null default now()
);

create table if not exists wiki_pages (
  id text primary key,
  slug text not null unique,
  title text not null,
  page_type text not null,
  summary text not null,
  body_markdown text not null,
  source_refs jsonb not null default '[]'::jsonb,
  revision integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists wiki_page_revisions (
  id text primary key,
  page_id text not null references wiki_pages(id) on delete cascade,
  revision integer not null,
  summary text not null,
  body_markdown text not null,
  source_refs jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  unique (page_id, revision)
);

create table if not exists wiki_links (
  id text primary key,
  source_page_id text not null references wiki_pages(id) on delete cascade,
  target_page_id text not null references wiki_pages(id) on delete cascade,
  relationship text not null,
  created_at timestamptz not null default now()
);

create table if not exists jobs (
  id text primary key,
  job_type text not null,
  payload jsonb not null default '{}'::jsonb,
  status text not null,
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists document_chunks_document_id_idx on document_chunks(document_id);
create index if not exists wiki_pages_slug_idx on wiki_pages(slug);
create index if not exists jobs_status_idx on jobs(status);

alter table wiki_pages
  add column if not exists source_refs jsonb not null default '[]'::jsonb;

alter table wiki_page_revisions
  add column if not exists source_refs jsonb not null default '[]'::jsonb;
