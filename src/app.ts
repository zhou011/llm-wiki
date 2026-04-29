import Fastify from "fastify";
import type { AppConfig } from "./config.js";
import type { RepositoryBundle } from "./repositories/interfaces.js";
import { createRepositories } from "./repositories/index.js";
import { registerAskRoutes } from "./routes/ask.js";
import { registerDocumentRoutes } from "./routes/documents.js";
import { registerHealthRoutes } from "./routes/health.js";
import { registerJobRoutes } from "./routes/jobs.js";
import { registerUiRoutes } from "./routes/ui.js";
import { registerWikiRoutes } from "./routes/wiki.js";

declare module "fastify" {
  interface FastifyInstance {
    config: AppConfig;
    repositories: RepositoryBundle;
  }
}

export async function createApp(config: AppConfig) {
  const app = Fastify({
    logger: false
  });

  const repositories = await createRepositories(config);
  app.decorate("config", config);
  app.decorate("repositories", repositories);

  app.addHook("onClose", async () => {
    await repositories.close();
  });

  await registerHealthRoutes(app);
  await registerUiRoutes(app);
  await registerDocumentRoutes(app);
  await registerWikiRoutes(app);
  await registerAskRoutes(app);
  await registerJobRoutes(app);

  return app;
}
