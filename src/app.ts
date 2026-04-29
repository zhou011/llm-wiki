import Fastify from "fastify";
import type { AppConfig } from "./config.js";
import type { RepositoryBundle } from "./repositories/interfaces.js";
import { createRepositories } from "./repositories/index.js";
import { registerAskRoutes } from "./routes/ask.js";
import { registerDocumentRoutes } from "./routes/documents.js";
import { registerDraftRoutes } from "./routes/drafts.js";
import { registerHealthRoutes } from "./routes/health.js";
import { registerJobRoutes } from "./routes/jobs.js";
import { registerLintRoutes } from "./routes/lint.js";
import { registerQueryRoutes } from "./routes/queries.js";
import { registerSchemaRoutes } from "./routes/schema.js";
import { registerUiRoutes } from "./routes/ui.js";
import { registerWikiRoutes } from "./routes/wiki.js";
import { SchemaService } from "./services/schema-service.js";

declare module "fastify" {
  interface FastifyInstance {
    config: AppConfig;
    repositories: RepositoryBundle;
    schemaService: SchemaService;
  }
}

export async function createApp(config: AppConfig) {
  const app = Fastify({
    logger: false
  });

  const repositories = await createRepositories(config);
  const schemaService = new SchemaService();
  app.decorate("config", config);
  app.decorate("repositories", repositories);
  app.decorate("schemaService", schemaService);

  app.addHook("onClose", async () => {
    await repositories.close();
  });

  await registerHealthRoutes(app);
  await registerSchemaRoutes(app);
  await registerUiRoutes(app);
  await registerDocumentRoutes(app);
  await registerDraftRoutes(app);
  await registerQueryRoutes(app);
  await registerWikiRoutes(app);
  await registerLintRoutes(app);
  await registerAskRoutes(app);
  await registerJobRoutes(app);

  return app;
}
