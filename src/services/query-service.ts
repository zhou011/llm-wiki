import type { AnswerEvidenceRecord, QaRecord, QuerySourceMode, WikiPageRecord } from "../domain/types.js";
import { createId } from "../lib/id.js";
import type { RepositoryBundle } from "../repositories/interfaces.js";

function collapseWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

export function normalizeQuestion(question: string): string {
  return collapseWhitespace(question.toLowerCase());
}

export class QueryService {
  constructor(private readonly repositories: RepositoryBundle) {}

  async createRecord(input: {
    question: string;
    answer: string;
    evidence: AnswerEvidenceRecord[];
    supportingPages: WikiPageRecord[];
    sourceMode?: QuerySourceMode;
    confidence?: number;
  }): Promise<QaRecord> {
    const now = new Date().toISOString();
    const record: QaRecord = {
      id: createId("query"),
      question: collapseWhitespace(input.question),
      normalizedQuestion: normalizeQuestion(input.question),
      answer: input.answer,
      evidence: input.evidence,
      supportingPageSlugs: input.supportingPages.map((page) => page.slug),
      sourceMode: input.sourceMode ?? "compiled-pages-only",
      confidence: input.confidence,
      createdAt: now,
      updatedAt: now
    };

    return this.repositories.queries.create(record);
  }
}
