import type { FastifyInstance } from "fastify";

export async function registerSchemaRoutes(app: FastifyInstance): Promise<void> {
  app.get("/schema/wiki", async () => {
    return app.schemaService.getWikiSchema();
  });
}
