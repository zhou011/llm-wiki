import { z } from "zod";
import type { AnswerEvidenceRecord, WikiPageRecord } from "../domain/types.js";
import { extractJsonObject } from "../lib/json.js";
import type { LanguageModelClient } from "../llm/types.js";
import { buildAskPrompt } from "./ask-prompts.js";

export interface AnswerSynthesizer {
  synthesize(question: string, pages: WikiPageRecord[]): Promise<{
    answer: string;
    evidence: AnswerEvidenceRecord[];
  }>;
}

export class PlaceholderAnswerSynthesizer implements AnswerSynthesizer {
  async synthesize(question: string, pages: WikiPageRecord[]): Promise<{
    answer: string;
    evidence: AnswerEvidenceRecord[];
  }> {
    return {
      answer: `Found ${pages.length} wiki page(s) related to "${question}". Live model synthesis is not enabled yet.`,
      evidence: pages.map((page) => ({
        pageTitle: page.title,
        pageSlug: page.slug,
        sourceRefs: page.sourceRefs ?? [],
        score: undefined
      }))
    };
  }
}

const synthesizedAnswerSchema = z.object({
  answer: z.string().min(1)
});

export class LlmAnswerSynthesizer implements AnswerSynthesizer {
  constructor(private readonly client: LanguageModelClient) {}

  async synthesize(question: string, pages: WikiPageRecord[]): Promise<{
    answer: string;
    evidence: AnswerEvidenceRecord[];
  }> {
    const response = await this.client.generateText({
      messages: buildAskPrompt(question, pages),
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
      evidence: pages.map((page) => ({
        pageTitle: page.title,
        pageSlug: page.slug,
        sourceRefs: page.sourceRefs ?? [],
        score: undefined
      }))
    };
  }
}

export class ResilientAnswerSynthesizer implements AnswerSynthesizer {
  constructor(
    private readonly primary: AnswerSynthesizer,
    private readonly fallback: AnswerSynthesizer
  ) {}

  async synthesize(question: string, pages: WikiPageRecord[]): Promise<{
    answer: string;
    evidence: AnswerEvidenceRecord[];
  }> {
    try {
      return await this.primary.synthesize(question, pages);
    } catch (error) {
      console.error("Falling back to placeholder answer synthesizer:", error);
      return this.fallback.synthesize(question, pages);
    }
  }
}
