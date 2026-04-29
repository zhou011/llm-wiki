import type {
  DocumentRecord,
  JobRecord,
  JobStatus,
  KnowledgeDraft,
  KnowledgeDraftStatus,
  LintFinding,
  LintReport,
  WikiLinkRecord,
  WikiPageRecord,
  WikiPageRevisionRecord,
  QaRecord
} from "../domain/types.js";

export interface RepositoryBundle {
  documents: DocumentRepository;
  jobs: JobRepository;
  wiki: WikiRepository;
  queries: QueryRecordRepository;
  drafts: KnowledgeDraftRepository;
  lint: LintRepository;
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

export interface QueryRecordRepository {
  list(limit?: number): Promise<QaRecord[]>;
  getById(id: string): Promise<QaRecord | undefined>;
  create(record: QaRecord): Promise<QaRecord>;
  countByNormalizedQuestion(normalizedQuestion: string): Promise<number>;
}

export interface KnowledgeDraftRepository {
  list(limit?: number): Promise<KnowledgeDraft[]>;
  getById(id: string): Promise<KnowledgeDraft | undefined>;
  create(draft: KnowledgeDraft): Promise<KnowledgeDraft>;
  updateStatus(id: string, status: KnowledgeDraftStatus): Promise<void>;
}

export interface LintRepository {
  listReports(limit?: number): Promise<LintReport[]>;
  getReportById(id: string): Promise<LintReport | undefined>;
  createReport(report: LintReport): Promise<LintReport>;
  addFinding(finding: LintFinding): Promise<LintFinding>;
  listFindingsByReportId(reportId: string): Promise<LintFinding[]>;
}
