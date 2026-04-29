import type { KnowledgeDraft, QaRecord, WikiPageRecord } from "../domain/types.js";
import { createId } from "../lib/id.js";
import type { RepositoryBundle } from "../repositories/interfaces.js";
import { SchemaService } from "./schema-service.js";
import { WikiService } from "./wiki-service.js";

function buildFaqDraftTitle(question: string): string {
  return `FAQ: ${question}`;
}

function buildComparisonDraftTitle(question: string): string {
  return `Comparison: ${question}`;
}

export class DraftService {
  private readonly schemaService = new SchemaService();
  private readonly wikiService: WikiService;

  constructor(private readonly repositories: RepositoryBundle) {
    this.wikiService = new WikiService(repositories);
  }

  async maybeCreateDraftsFromQuery(record: QaRecord, supportingPages: WikiPageRecord[]): Promise<KnowledgeDraft[]> {
    const schema = await this.schemaService.getWikiSchema();
    const created: KnowledgeDraft[] = [];
    const existingDrafts = await this.repositories.drafts.list(200);

    const faqThreshold = schema.writeBackRules.faqQuestionRepeatThreshold;
    const questionCount = await this.repositories.queries.countByNormalizedQuestion(record.normalizedQuestion);

    if (questionCount >= faqThreshold) {
      const title = buildFaqDraftTitle(record.question);
      const exists = existingDrafts.some((draft) => (
        draft.status === "proposed" &&
        draft.draftType === "faq" &&
        draft.title === title
      ));

      if (!exists) {
        created.push(await this.repositories.drafts.create({
          id: createId("draft"),
          draftType: "faq",
          status: "proposed",
          sourceQueryId: record.id,
          title,
          proposedBodyMarkdown: [
            `# ${title}`,
            "",
            "## Question",
            record.question,
            "",
            "## Short Answer",
            record.answer,
            "",
            "## Evidence",
            ...record.evidence.map((entry) => `- ${entry.sourceLabel}: ${entry.excerpt}`)
          ].join("\n"),
          proposedSummary: record.answer,
          proposedSourceRefs: record.evidence.map((entry) => ({
            label: entry.sourceLabel,
            excerpt: entry.excerpt
          })),
          reason: `Normalized question reached repeat threshold (${questionCount}).`,
          createdAt: record.createdAt,
          updatedAt: record.updatedAt
        }));
      }
    }

    if (supportingPages.length >= schema.writeBackRules.comparisonSupportingPageThreshold) {
      const title = buildComparisonDraftTitle(record.question);
      const exists = existingDrafts.some((draft) => (
        draft.status === "proposed" &&
        draft.draftType === "comparison" &&
        draft.title === title
      ));

      if (!exists) {
        created.push(await this.repositories.drafts.create({
          id: createId("draft"),
          draftType: "comparison",
          status: "proposed",
          sourceQueryId: record.id,
          title,
          proposedBodyMarkdown: [
            `# ${title}`,
            "",
            "## Overview",
            record.answer,
            "",
            "## Comparison",
            ...supportingPages.map((page) => `- ${page.title}: ${page.summary}`),
            "",
            "## Evidence",
            ...record.evidence.map((entry) => `- ${entry.sourceLabel}: ${entry.excerpt}`)
          ].join("\n"),
          proposedSummary: record.answer,
          proposedSourceRefs: record.evidence.map((entry) => ({
            label: entry.sourceLabel,
            excerpt: entry.excerpt
          })),
          reason: `Query synthesized ${supportingPages.length} supporting pages.`,
          createdAt: record.createdAt,
          updatedAt: record.updatedAt
        }));
      }
    }

    return created;
  }

  async applyDraft(id: string): Promise<KnowledgeDraft | undefined> {
    const draft = await this.repositories.drafts.getById(id);
    if (!draft) {
      return undefined;
    }

    const pageType = draft.draftType === "comparison" ? "comparison" : "faq";
    await this.wikiService.upsertTopicPage(
      draft.title,
      pageType,
      draft.proposedBodyMarkdown,
      draft.proposedSummary,
      draft.proposedSourceRefs
    );
    await this.repositories.drafts.updateStatus(id, "applied");
    return this.repositories.drafts.getById(id);
  }
}
