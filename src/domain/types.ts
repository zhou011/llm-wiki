export type SourceType = "markdown" | "pdf" | "html" | "text";
export type DocumentStatus = "queued" | "processing" | "compiled" | "failed";
export type PageType = "entity" | "topic" | "timeline" | "faq" | "comparison" | "concept" | "index";
export type JobStatus = "queued" | "running" | "completed" | "failed";
export type JobType = "compile-document";
export type QuerySourceMode = "compiled-pages-only";
export type KnowledgeDraftType = "faq" | "comparison" | "page-update";
export type KnowledgeDraftStatus = "proposed" | "approved" | "rejected" | "applied";
export type LintReportStatus = "completed";
export type LintFindingType =
  | "orphan-page"
  | "weak-sourcing"
  | "stale-page"
  | "duplicate-topic"
  | "high-query-low-coverage"
  | "missing-comparison-page"
  | "contradictory-summary";
export type LintSeverity = "low" | "medium" | "high";

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

export interface WikiSchemaPageTypeRule {
  requiredSections: string[];
  createWhen: string;
}

export interface WikiSchema {
  pageTypes: Record<PageType, WikiSchemaPageTypeRule>;
  writeBackRules: {
    faqQuestionRepeatThreshold: number;
    comparisonSupportingPageThreshold: number;
    minimumEvidenceCount: number;
  };
  lintRules: {
    minimumSourceRefsPerPage: number;
    highQueryLowCoverageThreshold: number;
    flagOrphanPages: boolean;
    flagWeakSourcing: boolean;
    flagDuplicateTitles: boolean;
  };
}

export interface QaRecord {
  id: string;
  question: string;
  normalizedQuestion: string;
  answer: string;
  evidence: AnswerEvidenceRecord[];
  supportingPageSlugs: string[];
  sourceMode: QuerySourceMode;
  confidence?: number;
  userFeedback?: string;
  createdAt: string;
  updatedAt: string;
}

export interface KnowledgeDraft {
  id: string;
  draftType: KnowledgeDraftType;
  status: KnowledgeDraftStatus;
  sourceQueryId: string;
  title: string;
  targetPageSlug?: string;
  proposedBodyMarkdown: string;
  proposedSummary: string;
  proposedSourceRefs: SourceRefRecord[];
  reason: string;
  createdAt: string;
  updatedAt: string;
}

export interface LintReport {
  id: string;
  status: LintReportStatus;
  findingCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface LintFinding {
  id: string;
  reportId: string;
  findingType: LintFindingType;
  severity: LintSeverity;
  message: string;
  pageSlug?: string;
  queryId?: string;
  metadata: Record<string, string>;
  createdAt: string;
}
