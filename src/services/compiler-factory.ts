import type { AppConfig } from "../config.js";
import { isLiveLlmConfigured } from "../config.js";
import { createLanguageModelClient } from "../llm/index.js";
import {
  LlmKnowledgeCompiler,
  PlaceholderKnowledgeCompiler,
  ResilientKnowledgeCompiler,
  type KnowledgeCompiler
} from "./knowledge-compiler.js";

export function createKnowledgeCompiler(config: AppConfig): KnowledgeCompiler {
  const fallback = new PlaceholderKnowledgeCompiler();

  if (isLiveLlmConfigured(config)) {
    return new ResilientKnowledgeCompiler(
      new LlmKnowledgeCompiler(createLanguageModelClient(config)),
      fallback
    );
  }

  return fallback;
}
