import type { FastifyInstance } from "fastify";
import { IngestionService } from "../services/ingestion-service.js";
import { WikiService } from "../services/wiki-service.js";

export async function registerWikiRoutes(app: FastifyInstance): Promise<void> {
  const wikiService = new WikiService(app.repositories);

  app.get("/wiki", async () => {
    return {
      pages: await wikiService.listPages()
    };
  });

  app.get("/wiki/:slug", async (request, reply) => {
    const params = request.params as { slug: string };
    const page = await wikiService.getPage(params.slug);
    if (!page) {
      return reply.code(404).send({ error: "Page not found" });
    }

    return {
      page,
      revisions: await app.repositories.wiki.listRevisions(page.id)
    };
  });

  app.post("/wiki/:slug/recompile", async (request, reply) => {
    const params = request.params as { slug: string };
    const page = await wikiService.getPage(params.slug);
    if (!page) {
      return reply.code(404).send({ error: "Page not found" });
    }

    const document = await app.repositories.documents.getByTitle(page.title);
    if (!document) {
      return reply.code(404).send({ error: "Source document not found for page" });
    }

    const ingestionService = new IngestionService(app.repositories);
    const job = await ingestionService.enqueueRecompile(document.id);

    if (!job) {
      return reply.code(404).send({ error: "Document not found" });
    }

    return reply.code(202).send({
      page: {
        slug: page.slug,
        title: page.title
      },
      job
    });
  });
}
