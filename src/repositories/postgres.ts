import type {
  DocumentRecord,
  JobRecord,
  JobStatus,
  SourceRefRecord,
  WikiLinkRecord,
  WikiPageRecord,
  WikiPageRevisionRecord
} from "../domain/types.js";
import type {
  DocumentRepository,
  JobRepository,
  RepositoryBundle,
  WikiRepository
} from "./interfaces.js";

type Queryable = {
  query<T>(sql: string, values?: unknown[]): Promise<{ rows: T[] }>;
  end(): Promise<void>;
};

type DocumentRow = {
  id: string;
  source_type: DocumentRecord["sourceType"];
  title: string;
  raw_content: string;
  metadata: Record<string, string>;
  status: DocumentRecord["status"];
  created_at: Date | string;
  updated_at: Date | string;
};

type JobRow = {
  id: string;
  job_type: JobRecord["jobType"];
  payload: Record<string, string>;
  status: JobRecord["status"];
  error: string | null;
  created_at: Date | string;
  updated_at: Date | string;
};

type WikiPageRow = {
  id: string;
  slug: string;
  title: string;
  page_type: WikiPageRecord["pageType"];
  summary: string;
  body_markdown: string;
  source_refs: unknown[] | null;
  revision: number;
  created_at: Date | string;
  updated_at: Date | string;
};

type WikiRevisionRow = {
  id: string;
  page_id: string;
  revision: number;
  summary: string;
  body_markdown: string;
  source_refs: unknown[] | null;
  created_at: Date | string;
};

type WikiLinkRow = {
  id: string;
  source_page_id: string;
  target_page_id: string;
  relationship: string;
  created_at: Date | string;
};

function toIso(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function normalizeSourceRefs(sourceRefs: unknown[] | null | undefined): SourceRefRecord[] {
  if (!sourceRefs) {
    return [];
  }

  return sourceRefs.flatMap((entry, index) => {
    if (typeof entry === "string") {
      return [{
        label: `legacy#${index + 1}`,
        excerpt: entry
      }];
    }

    if (entry && typeof entry === "object") {
      const candidate = entry as { label?: unknown; excerpt?: unknown };
      if (typeof candidate.label === "string" && typeof candidate.excerpt === "string") {
        return [{
          label: candidate.label,
          excerpt: candidate.excerpt
        }];
      }
    }

    return [];
  });
}

function mapDocument(row: DocumentRow): DocumentRecord {
  return {
    id: row.id,
    sourceType: row.source_type,
    title: row.title,
    rawContent: row.raw_content,
    metadata: row.metadata ?? {},
    status: row.status,
    createdAt: toIso(row.created_at),
    updatedAt: toIso(row.updated_at)
  };
}

function mapJob(row: JobRow): JobRecord {
  return {
    id: row.id,
    jobType: row.job_type,
    payload: row.payload ?? {},
    status: row.status,
    error: row.error ?? undefined,
    createdAt: toIso(row.created_at),
    updatedAt: toIso(row.updated_at)
  };
}

function mapWikiPage(row: WikiPageRow): WikiPageRecord {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    pageType: row.page_type,
    summary: row.summary,
    bodyMarkdown: row.body_markdown,
    sourceRefs: normalizeSourceRefs(row.source_refs),
    revision: row.revision,
    createdAt: toIso(row.created_at),
    updatedAt: toIso(row.updated_at)
  };
}

function mapWikiRevision(row: WikiRevisionRow): WikiPageRevisionRecord {
  return {
    id: row.id,
    pageId: row.page_id,
    revision: row.revision,
    summary: row.summary,
    bodyMarkdown: row.body_markdown,
    sourceRefs: normalizeSourceRefs(row.source_refs),
    createdAt: toIso(row.created_at)
  };
}

function mapWikiLink(row: WikiLinkRow): WikiLinkRecord {
  return {
    id: row.id,
    sourcePageId: row.source_page_id,
    targetPageId: row.target_page_id,
    relationship: row.relationship,
    createdAt: toIso(row.created_at)
  };
}

class PostgresDocumentRepository implements DocumentRepository {
  constructor(private readonly db: Queryable) {}

  async list(): Promise<DocumentRecord[]> {
    const result = await this.db.query<DocumentRow>(
      "select * from documents order by created_at desc"
    );
    return result.rows.map(mapDocument);
  }

  async getById(id: string): Promise<DocumentRecord | undefined> {
    const result = await this.db.query<DocumentRow>(
      "select * from documents where id = $1 limit 1",
      [id]
    );
    return result.rows[0] ? mapDocument(result.rows[0]) : undefined;
  }

  async getByTitle(title: string): Promise<DocumentRecord | undefined> {
    const result = await this.db.query<DocumentRow>(
      "select * from documents where title = $1 order by created_at desc limit 1",
      [title]
    );
    return result.rows[0] ? mapDocument(result.rows[0]) : undefined;
  }

  async create(document: DocumentRecord): Promise<DocumentRecord> {
    const result = await this.db.query<DocumentRow>(
      `insert into documents
       (id, source_type, title, raw_content, metadata, status, created_at, updated_at)
       values ($1, $2, $3, $4, $5::jsonb, $6, $7, $8)
       returning *`,
      [
        document.id,
        document.sourceType,
        document.title,
        document.rawContent,
        JSON.stringify(document.metadata),
        document.status,
        document.createdAt,
        document.updatedAt
      ]
    );
    return mapDocument(result.rows[0]);
  }

  async updateStatus(id: string, status: DocumentRecord["status"]): Promise<void> {
    await this.db.query(
      "update documents set status = $2, updated_at = now() where id = $1",
      [id, status]
    );
  }
}

class PostgresJobRepository implements JobRepository {
  constructor(private readonly db: Queryable) {}

  async listByStatus(status: JobStatus): Promise<JobRecord[]> {
    const result = await this.db.query<JobRow>(
      "select * from jobs where status = $1 order by created_at asc",
      [status]
    );
    return result.rows.map(mapJob);
  }

  async create(job: JobRecord): Promise<JobRecord> {
    const result = await this.db.query<JobRow>(
      `insert into jobs
       (id, job_type, payload, status, error, created_at, updated_at)
       values ($1, $2, $3::jsonb, $4, $5, $6, $7)
       returning *`,
      [
        job.id,
        job.jobType,
        JSON.stringify(job.payload),
        job.status,
        job.error ?? null,
        job.createdAt,
        job.updatedAt
      ]
    );
    return mapJob(result.rows[0]);
  }

  async update(jobId: string, update: Partial<JobRecord>): Promise<void> {
    await this.db.query(
      `update jobs
       set status = coalesce($2, status),
           error = $3,
           payload = coalesce($4::jsonb, payload),
           updated_at = now()
       where id = $1`,
      [
        jobId,
        update.status ?? null,
        update.error ?? null,
        update.payload ? JSON.stringify(update.payload) : null
      ]
    );
  }
}

class PostgresWikiRepository implements WikiRepository {
  constructor(private readonly db: Queryable) {}

  async listPages(): Promise<WikiPageRecord[]> {
    const result = await this.db.query<WikiPageRow>(
      "select * from wiki_pages order by updated_at desc"
    );
    return result.rows.map(mapWikiPage);
  }

  async getPageBySlug(slug: string): Promise<WikiPageRecord | undefined> {
    const result = await this.db.query<WikiPageRow>(
      "select * from wiki_pages where slug = $1 limit 1",
      [slug]
    );
    return result.rows[0] ? mapWikiPage(result.rows[0]) : undefined;
  }

  async getPageByTitle(title: string): Promise<WikiPageRecord | undefined> {
    const result = await this.db.query<WikiPageRow>(
      "select * from wiki_pages where title = $1 limit 1",
      [title]
    );
    return result.rows[0] ? mapWikiPage(result.rows[0]) : undefined;
  }

  async createPage(page: WikiPageRecord): Promise<WikiPageRecord> {
    const result = await this.db.query<WikiPageRow>(
      `insert into wiki_pages
       (id, slug, title, page_type, summary, body_markdown, source_refs, revision, created_at, updated_at)
       values ($1, $2, $3, $4, $5, $6, $7::jsonb, $8, $9, $10)
       returning *`,
      [
        page.id,
        page.slug,
        page.title,
        page.pageType,
        page.summary,
        page.bodyMarkdown,
        JSON.stringify(page.sourceRefs ?? []),
        page.revision,
        page.createdAt,
        page.updatedAt
      ]
    );
    return mapWikiPage(result.rows[0]);
  }

  async updatePage(pageId: string, update: Partial<WikiPageRecord>): Promise<WikiPageRecord | undefined> {
    const result = await this.db.query<WikiPageRow>(
      `update wiki_pages
       set slug = coalesce($2, slug),
           title = coalesce($3, title),
           page_type = coalesce($4, page_type),
           summary = coalesce($5, summary),
           body_markdown = coalesce($6, body_markdown),
           source_refs = coalesce($7::jsonb, source_refs),
           revision = coalesce($8, revision),
           updated_at = now()
       where id = $1
       returning *`,
      [
        pageId,
        update.slug ?? null,
        update.title ?? null,
        update.pageType ?? null,
        update.summary ?? null,
        update.bodyMarkdown ?? null,
        update.sourceRefs ? JSON.stringify(update.sourceRefs) : null,
        update.revision ?? null
      ]
    );
    return result.rows[0] ? mapWikiPage(result.rows[0]) : undefined;
  }

  async addRevision(revision: WikiPageRevisionRecord): Promise<WikiPageRevisionRecord> {
    const result = await this.db.query<WikiRevisionRow>(
      `insert into wiki_page_revisions
       (id, page_id, revision, summary, body_markdown, source_refs, created_at)
       values ($1, $2, $3, $4, $5, $6::jsonb, $7)
       returning *`,
      [
        revision.id,
        revision.pageId,
        revision.revision,
        revision.summary,
        revision.bodyMarkdown,
        JSON.stringify(revision.sourceRefs ?? []),
        revision.createdAt
      ]
    );
    return mapWikiRevision(result.rows[0]);
  }

  async replaceLinksForPage(sourcePageId: string, links: WikiLinkRecord[]): Promise<void> {
    await this.db.query(
      "delete from wiki_links where source_page_id = $1",
      [sourcePageId]
    );

    for (const link of links) {
      await this.addLink(link);
    }
  }

  async addLink(link: WikiLinkRecord): Promise<WikiLinkRecord> {
    await this.db.query(
      `insert into wiki_links
       (id, source_page_id, target_page_id, relationship, created_at)
       values ($1, $2, $3, $4, $5)`,
      [link.id, link.sourcePageId, link.targetPageId, link.relationship, link.createdAt]
    );
    return link;
  }

  async listLinksFromPage(sourcePageId: string): Promise<WikiLinkRecord[]> {
    const result = await this.db.query<WikiLinkRow>(
      "select * from wiki_links where source_page_id = $1 order by created_at asc",
      [sourcePageId]
    );
    return result.rows.map(mapWikiLink);
  }

  async listRevisions(pageId: string): Promise<WikiPageRevisionRecord[]> {
    const result = await this.db.query<WikiRevisionRow>(
      "select * from wiki_page_revisions where page_id = $1 order by revision desc",
      [pageId]
    );
    return result.rows.map(mapWikiRevision);
  }
}

export async function createPostgresRepositories(databaseUrl: string): Promise<RepositoryBundle> {
  const pgModule = await import("pg");
  const pool = new pgModule.Pool({
    connectionString: databaseUrl
  }) as Queryable;

  return {
    documents: new PostgresDocumentRepository(pool),
    jobs: new PostgresJobRepository(pool),
    wiki: new PostgresWikiRepository(pool),
    async close(): Promise<void> {
      await pool.end();
    }
  };
}
