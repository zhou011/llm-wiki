import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { IngestionService } from "../services/ingestion-service.js";

const createDocumentSchema = z.object({
  sourceType: z.enum(["markdown", "pdf", "html", "text"]),
  title: z.string().min(1),
  rawContent: z.string().min(1),
  metadata: z.record(z.string()).optional()
});

export async function registerDocumentRoutes(app: FastifyInstance): Promise<void> {
  app.get("/documents", async () => {
    return {
      documents: await app.repositories.documents.list()
    };
  });

  app.post("/documents", async (request, reply) => {
    const parsed = createDocumentSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({
        error: "Invalid document payload",
        issues: parsed.error.flatten()
      });
    }

    const ingestionService = new IngestionService(app.repositories);
    const result = await ingestionService.createDocument(parsed.data);

    return reply.code(201).send(result);
  });

  app.post("/documents/:id/recompile", async (request, reply) => {
    const params = request.params as { id: string };
    const ingestionService = new IngestionService(app.repositories);
    const job = await ingestionService.enqueueRecompile(params.id);

    if (!job) {
      return reply.code(404).send({ error: "Document not found" });
    }

    return reply.code(202).send({ job });
  });
}
