import type { AppConfig } from "../config.js";
import type { RepositoryBundle } from "./interfaces.js";
import { createMemoryRepositories } from "./memory.js";
import { createPostgresRepositories } from "./postgres.js";

export async function createRepositories(config: AppConfig): Promise<RepositoryBundle> {
  if (config.STORAGE_DRIVER === "postgres") {
    return createPostgresRepositories(config.DATABASE_URL!);
  }

  return createMemoryRepositories();
}
