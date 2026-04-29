import { z } from "zod";
import type { AnswerEvidenceRecord, WikiPageRecord } from "../domain/types.js";
import { extractJsonObject } from "../lib/json.js";
import type { LanguageModelClient } from "../llm/types.js";
import { buildAskPrompt } from "./ask-prompts.js";

function buildEvidenceFromPages(pages: WikiPageRecord[]): AnswerEvidenceRecord[] {
  return pages.flatMap((page) => {
    const sourceRefs = page.sourceRefs ?? [];
    if (sourceRefs.length > 0) {
      return sourceRefs.map((sourceRef) => ({
        pageTitle: page.title,
        pageSlug: page.slug,
        sourceLabel: sourceRef.label,
        excerpt: sourceRef.excerpt,
        score: undefined
      }));
    }

    return [{
      pageTitle: page.title,
      pageSlug: page.slug,
      sourceLabel: `${page.title}#summary`,
      excerpt: page.summary,
      score: undefined
    }];
  });
}

export interface AnswerSynthesizer {
  synthesize(question: string, pages: WikiPageRecord[], evidence?: AnswerEvidenceRecord[]): Promise<{
    answer: string;
    evidence: AnswerEvidenceRecord[];
  }>;
}

export class PlaceholderAnswerSynthesizer implements AnswerSynthesizer {
  async synthesize(question: string, pages: WikiPageRecord[], evidence?: AnswerEvidenceRecord[]): Promise<{
    answer: string;
    evidence: AnswerEvidenceRecord[];
  }> {
    return {
      answer: `Found ${pages.length} wiki page(s) related to "${question}". Live model synthesis is not enabled yet.`,
      evidence: evidence && evidence.length > 0 ? evidence : buildEvidenceFromPages(pages)
    };
  }
}

const synthesizedAnswerSchema = z.object({
  answer: z.string().min(1)
});

export class LlmAnswerSynthesizer implements AnswerSynthesizer {
  constructor(private readonly client: LanguageModelClient) {}

  async synthesize(question: string, pages: WikiPageRecord[], evidence?: AnswerEvidenceRecord[]): Promise<{
    answer: string;
    evidence: AnswerEvidenceRecord[];
  }> {
    const promptEvidence = evidence && evidence.length > 0 ? evidence : buildEvidenceFromPages(pages);
    const response = await this.client.generateText({
      messages: buildAskPrompt(question, pages, promptEvidence),
      temperature: 0.2
    });
    let answerText = response.text.trim();

    try {
      const parsed = synthesizedAnswerSchema.parse(
        JSON.parse(extractJsonObject(response.text)) as { answer: string }
      );
      answerText = parsed.answer;
    } catch {
      // Keep plain-text compatibility for providers that do not follow the JSON instruction.
    }

    return {
      answer: answerText,
      evidence: promptEvidence
    };
  }
}

export class ResilientAnswerSynthesizer implements AnswerSynthesizer {
  constructor(
    private readonly primary: AnswerSynthesizer,
    private readonly fallback: AnswerSynthesizer
  ) {}

  async synthesize(question: string, pages: WikiPageRecord[], evidence?: AnswerEvidenceRecord[]): Promise<{
    answer: string;
    evidence: AnswerEvidenceRecord[];
  }> {
    try {
      return await this.primary.synthesize(question, pages, evidence);
    } catch (error) {
      console.error("Falling back to placeholder answer synthesizer:", error);
      return this.fallback.synthesize(question, pages, evidence);
    }
  }
}
