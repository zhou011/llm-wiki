import type { FastifyInstance } from "fastify";

export async function registerLintRoutes(app: FastifyInstance): Promise<void> {
  app.get("/lint/reports", async () => {
    return {
      reports: await app.repositories.lint.listReports(50)
    };
  });

  app.get("/lint/reports/:id", async (request, reply) => {
    const params = request.params as { id: string };
    const report = await app.repositories.lint.getReportById(params.id);
    if (!report) {
      return reply.code(404).send({ error: "Lint report not found" });
    }

    return {
      report,
      findings: await app.repositories.lint.listFindingsByReportId(params.id)
    };
  });
}
