import { loadConfig } from "./config.js";
import { createApp } from "./app.js";

async function main(): Promise<void> {
  const config = loadConfig();
  const app = await createApp(config);
  const port = config.PORT;
  const host = "0.0.0.0";

  await app.listen({ port, host });
  console.log(`LLM Wiki listening on http://${host}:${port}`);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
