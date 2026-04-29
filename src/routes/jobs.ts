import type { FastifyInstance } from "fastify";
import { createKnowledgeCompiler } from "../services/compiler-factory.js";
import { LintService } from "../services/lint-service.js";
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

  app.post("/jobs/lint", async () => {
    const lintService = new LintService(app.repositories);
    const result = await lintService.run();
    return {
      report: result.report,
      findingCount: result.findings.length
    };
  });
}
