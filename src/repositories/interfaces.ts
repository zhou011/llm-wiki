import type {
  DocumentRecord,
  JobRecord,
  JobStatus,
  WikiLinkRecord,
  WikiPageRecord,
  WikiPageRevisionRecord
} from "../domain/types.js";

export interface RepositoryBundle {
  documents: DocumentRepository;
  jobs: JobRepository;
  wiki: WikiRepository;
  close(): Promise<void>;
}

export interface DocumentRepository {
  list(): Promise<DocumentRecord[]>;
  getById(id: string): Promise<DocumentRecord | undefined>;
  getByTitle(title: string): Promise<DocumentRecord | undefined>;
  create(document: DocumentRecord): Promise<DocumentRecord>;
  updateStatus(id: string, status: DocumentRecord["status"]): Promise<void>;
}

export interface JobRepository {
  listByStatus(status: JobStatus): Promise<JobRecord[]>;
  create(job: JobRecord): Promise<JobRecord>;
  update(jobId: string, update: Partial<JobRecord>): Promise<void>;
}

export interface WikiRepository {
  listPages(): Promise<WikiPageRecord[]>;
  getPageBySlug(slug: string): Promise<WikiPageRecord | undefined>;
  getPageByTitle(title: string): Promise<WikiPageRecord | undefined>;
  createPage(page: WikiPageRecord): Promise<WikiPageRecord>;
  updatePage(pageId: string, update: Partial<WikiPageRecord>): Promise<WikiPageRecord | undefined>;
  addRevision(revision: WikiPageRevisionRecord): Promise<WikiPageRevisionRecord>;
  replaceLinksForPage(sourcePageId: string, links: WikiLinkRecord[]): Promise<void>;
  addLink(link: WikiLinkRecord): Promise<WikiLinkRecord>;
  listLinksFromPage(sourcePageId: string): Promise<WikiLinkRecord[]>;
  listRevisions(pageId: string): Promise<WikiPageRevisionRecord[]>;
}
