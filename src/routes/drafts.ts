import type { FastifyInstance } from "fastify";
import { DraftService } from "../services/draft-service.js";

export async function registerDraftRoutes(app: FastifyInstance): Promise<void> {
  const draftService = new DraftService(app.repositories);

  app.get("/drafts", async () => {
    return {
      drafts: await app.repositories.drafts.list(100)
    };
  });

  app.get("/drafts/:id", async (request, reply) => {
    const params = request.params as { id: string };
    const draft = await app.repositories.drafts.getById(params.id);
    if (!draft) {
      return reply.code(404).send({ error: "Draft not found" });
    }

    return { draft };
  });

  app.post("/drafts/:id/reject", async (request, reply) => {
    const params = request.params as { id: string };
    const draft = await app.repositories.drafts.getById(params.id);
    if (!draft) {
      return reply.code(404).send({ error: "Draft not found" });
    }

    await app.repositories.drafts.updateStatus(params.id, "rejected");
    return { draft: await app.repositories.drafts.getById(params.id) };
  });

  app.post("/drafts/:id/apply", async (request, reply) => {
    const params = request.params as { id: string };
    const applied = await draftService.applyDraft(params.id);
    if (!applied) {
      return reply.code(404).send({ error: "Draft not found" });
    }

    return { draft: applied };
  });
}
