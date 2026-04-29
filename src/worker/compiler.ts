import { WikiService } from "../services/wiki-service.js";
import type { KnowledgeCompiler } from "../services/knowledge-compiler.js";
import type { RepositoryBundle } from "../repositories/interfaces.js";

export class CompilerWorker {
  constructor(
    private readonly repositories: RepositoryBundle,
    private readonly wikiService: WikiService,
    private readonly compiler: KnowledgeCompiler
  ) {}

  async runOnce(): Promise<number> {
    const jobs = await this.repositories.jobs.listByStatus("queued");

    for (const job of jobs) {
      const documentId = job.payload.documentId;
      if (!documentId) {
        await this.repositories.jobs.update(job.id, {
          status: "failed",
          error: "Missing documentId in job payload"
        });
        continue;
      }

      const document = await this.repositories.documents.getById(documentId);
      if (!document) {
        await this.repositories.jobs.update(job.id, {
          status: "failed",
          error: `Document ${documentId} not found`
        });
        continue;
      }

      await this.repositories.jobs.update(job.id, { status: "running" });
      await this.repositories.documents.updateStatus(document.id, "processing");

      const draft = await this.compiler.compile(document);
      await this.wikiService.upsertTopicPage(
        draft.title,
        draft.pageType,
        draft.bodyMarkdown,
        draft.summary,
        draft.sourceRefs,
        draft.outboundLinks
      );

      await this.repositories.documents.updateStatus(document.id, "compiled");
      await this.repositories.jobs.update(job.id, { status: "completed" });
    }

    return jobs.length;
  }
}
