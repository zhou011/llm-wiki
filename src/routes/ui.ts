import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { FastifyInstance } from "fastify";

const currentDir = dirname(fileURLToPath(import.meta.url));
const publicDir = join(currentDir, "../../public");

const staticAssets = new Map<string, { fileName: string; contentType: string }>([
  ["/", { fileName: "index.html", contentType: "text/html; charset=utf-8" }],
  ["/styles.css", { fileName: "styles.css", contentType: "text/css; charset=utf-8" }],
  ["/app.js", { fileName: "app.js", contentType: "application/javascript; charset=utf-8" }]
]);

export async function registerUiRoutes(app: FastifyInstance): Promise<void> {
  for (const [routePath, asset] of staticAssets.entries()) {
    app.get(routePath, async (request, reply) => {
      void request;
      const file = await readFile(join(publicDir, asset.fileName), "utf8");
      return reply
        .type(asset.contentType)
        .send(file);
    });
  }
}
