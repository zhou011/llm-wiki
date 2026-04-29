import type { FastifyInstance } from "fastify";
import { createKnowledgeCompiler } from "../services/compiler-factory.js";
import { CompilerWorker } from "../worker/compiler.js";
import { WikiService } from "../services/wiki-service.js";

export async function registerJobRoutes(app: FastifyInstance): Promise<void> {
  app.post("/jobs/compile", async () => {
    const worker = new CompilerWorker(
      app.repositories,
      new WikiService(app.repositories),
      createKnowledgeCompiler(app.config)
    );
    const processed = await worker.runOnce();
    return {
      processed
    };
  });
}
