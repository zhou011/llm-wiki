import type {
  DocumentRecord,
  JobRecord,
  JobStatus,
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

class MemoryDocumentRepository implements DocumentRepository {
  private readonly documents = new Map<string, DocumentRecord>();

  async list(): Promise<DocumentRecord[]> {
    return Array.from(this.documents.values());
  }

  async getById(id: string): Promise<DocumentRecord | undefined> {
    return this.documents.get(id);
  }

  async getByTitle(title: string): Promise<DocumentRecord | undefined> {
    return Array.from(this.documents.values()).find((document) => document.title === title);
  }

  async create(document: DocumentRecord): Promise<DocumentRecord> {
    this.documents.set(document.id, document);
    return document;
  }

  async updateStatus(id: string, status: DocumentRecord["status"]): Promise<void> {
    const existing = this.documents.get(id);
    if (!existing) {
      return;
    }

    this.documents.set(id, {
      ...existing,
      status,
      updatedAt: new Date().toISOString()
    });
  }
}

class MemoryJobRepository implements JobRepository {
  private readonly jobs = new Map<string, JobRecord>();

  async listByStatus(status: JobStatus): Promise<JobRecord[]> {
    return Array.from(this.jobs.values()).filter((job) => job.status === status);
  }

  async create(job: JobRecord): Promise<JobRecord> {
    this.jobs.set(job.id, job);
    return job;
  }

  async update(jobId: string, update: Partial<JobRecord>): Promise<void> {
    const existing = this.jobs.get(jobId);
    if (!existing) {
      return;
    }

    this.jobs.set(jobId, {
      ...existing,
      ...update,
      updatedAt: new Date().toISOString()
    });
  }
}

class MemoryWikiRepository implements WikiRepository {
  private readonly pages = new Map<string, WikiPageRecord>();
  private readonly revisions = new Map<string, WikiPageRevisionRecord[]>();
  private readonly links = new Map<string, WikiLinkRecord>();

  async listPages(): Promise<WikiPageRecord[]> {
    return Array.from(this.pages.values());
  }

  async getPageBySlug(slug: string): Promise<WikiPageRecord | undefined> {
    return Array.from(this.pages.values()).find((page) => page.slug === slug);
  }

  async getPageByTitle(title: string): Promise<WikiPageRecord | undefined> {
    return Array.from(this.pages.values()).find((page) => page.title === title);
  }

  async createPage(page: WikiPageRecord): Promise<WikiPageRecord> {
    this.pages.set(page.id, page);
    return page;
  }

  async updatePage(pageId: string, update: Partial<WikiPageRecord>): Promise<WikiPageRecord | undefined> {
    const existing = this.pages.get(pageId);
    if (!existing) {
      return undefined;
    }

    const next = {
      ...existing,
      ...update,
      updatedAt: new Date().toISOString()
    };
    this.pages.set(pageId, next);
    return next;
  }

  async addRevision(revision: WikiPageRevisionRecord): Promise<WikiPageRevisionRecord> {
    const existing = this.revisions.get(revision.pageId) ?? [];
    existing.push(revision);
    this.revisions.set(revision.pageId, existing);
    return revision;
  }

  async replaceLinksForPage(sourcePageId: string, links: WikiLinkRecord[]): Promise<void> {
    for (const [id, link] of this.links.entries()) {
      if (link.sourcePageId === sourcePageId) {
        this.links.delete(id);
      }
    }

    for (const link of links) {
      this.links.set(link.id, link);
    }
  }

  async addLink(link: WikiLinkRecord): Promise<WikiLinkRecord> {
    this.links.set(link.id, link);
    return link;
  }

  async listLinksFromPage(sourcePageId: string): Promise<WikiLinkRecord[]> {
    return Array.from(this.links.values()).filter((link) => link.sourcePageId === sourcePageId);
  }

  async listRevisions(pageId: string): Promise<WikiPageRevisionRecord[]> {
    return this.revisions.get(pageId) ?? [];
  }
}

export function createMemoryRepositories(): RepositoryBundle {
  return {
    documents: new MemoryDocumentRepository(),
    jobs: new MemoryJobRepository(),
    wiki: new MemoryWikiRepository(),
    async close(): Promise<void> {}
  };
}
