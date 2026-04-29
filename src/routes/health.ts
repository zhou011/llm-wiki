import { isLiveLlmConfigured } from "../config.js";
import type { FastifyInstance } from "fastify";

export async function registerHealthRoutes(app: FastifyInstance): Promise<void> {
  app.get("/health", async () => {
    return {
      status: "ok",
      service: "llm-wiki",
      storageDriver: app.config.STORAGE_DRIVER,
      llmProvider: app.config.LLM_PROVIDER,
      llmModel: app.config.LLM_MODEL,
      llmReady: isLiveLlmConfigured(app.config),
      llmTimeoutMs: app.config.LLM_TIMEOUT_MS,
      timestamp: new Date().toISOString()
    };
  });
}
