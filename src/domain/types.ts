export type SourceType = "markdown" | "pdf" | "html" | "text";
export type DocumentStatus = "queued" | "processing" | "compiled" | "failed";
export type PageType = "entity" | "topic" | "timeline";
export type JobStatus = "queued" | "running" | "completed" | "failed";
export type JobType = "compile-document";

export interface SourceRefRecord {
  label: string;
  excerpt: string;
}

export interface AnswerEvidenceRecord {
  pageTitle: string;
  pageSlug: string;
  sourceLabel: string;
  excerpt: string;
  score?: number;
}

export interface DocumentRecord {
  id: string;
  sourceType: SourceType;
  title: string;
  rawContent: string;
  metadata: Record<string, string>;
  status: DocumentStatus;
  createdAt: string;
  updatedAt: string;
}

export interface WikiPageRecord {
  id: string;
  slug: string;
  title: string;
  pageType: PageType;
  summary: string;
  bodyMarkdown: string;
  sourceRefs?: SourceRefRecord[];
  outboundLinks?: string[];
  revision: number;
  createdAt: string;
  updatedAt: string;
}

export interface WikiPageRevisionRecord {
  id: string;
  pageId: string;
  revision: number;
  summary: string;
  bodyMarkdown: string;
  sourceRefs?: SourceRefRecord[];
  createdAt: string;
}

export interface WikiLinkRecord {
  id: string;
  sourcePageId: string;
  targetPageId: string;
  relationship: string;
  createdAt: string;
}

export interface JobRecord {
  id: string;
  jobType: JobType;
  payload: Record<string, string>;
  status: JobStatus;
  error?: string;
  createdAt: string;
  updatedAt: string;
}
