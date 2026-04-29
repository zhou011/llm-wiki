import type { FastifyInstance } from "fastify";

export async function registerQueryRoutes(app: FastifyInstance): Promise<void> {
  app.get("/queries", async () => {
    return {
      queries: await app.repositories.queries.list(50)
    };
  });

  app.get("/queries/:id", async (request, reply) => {
    const params = request.params as { id: string };
    const record = await app.repositories.queries.getById(params.id);

    if (!record) {
      return reply.code(404).send({ error: "Query record not found" });
    }

    return { query: record };
  });
}
