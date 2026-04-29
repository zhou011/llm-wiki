import type { AppConfig } from "../config.js";
import { OpenAICompatibleLanguageModelClient } from "./openai-compatible-client.js";
import { PlaceholderLanguageModelClient } from "./placeholder-client.js";
import type { LanguageModelClient } from "./types.js";

export function createLanguageModelClient(config: AppConfig): LanguageModelClient {
  if (config.LLM_PROVIDER === "openai-compatible") {
    return new OpenAICompatibleLanguageModelClient(config);
  }

  return new PlaceholderLanguageModelClient();
}
