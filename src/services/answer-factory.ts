import type { AppConfig } from "../config.js";
import { isLiveLlmConfigured } from "../config.js";
import { createLanguageModelClient } from "../llm/index.js";
import {
  LlmAnswerSynthesizer,
  PlaceholderAnswerSynthesizer,
  ResilientAnswerSynthesizer,
  type AnswerSynthesizer
} from "./answer-synthesizer.js";

export function createAnswerSynthesizer(config: AppConfig): AnswerSynthesizer {
  const fallback = new PlaceholderAnswerSynthesizer();

  if (isLiveLlmConfigured(config)) {
    return new ResilientAnswerSynthesizer(
      new LlmAnswerSynthesizer(createLanguageModelClient(config)),
      fallback
    );
  }

  return fallback;
}
