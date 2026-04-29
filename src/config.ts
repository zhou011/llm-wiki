import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { z } from "zod";

function readDotEnvFile(filePath: string): Record<string, string> {
  if (!existsSync(filePath)) {
    return {};
  }

  const content = readFileSync(filePath, "utf8");
  const values: Record<string, string> = {};

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) {
      continue;
    }

    const separatorIndex = line.indexOf("=");
    if (separatorIndex < 0) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    const value = line.slice(separatorIndex + 1).trim();
    values[key] = value;
  }

  return values;
}

function mergeEnv(env: NodeJS.ProcessEnv): Record<string, string | undefined> {
  const envPath = resolve(process.cwd(), ".env");
  const fileValues = readDotEnvFile(envPath);

  return {
    ...fileValues,
    ...env
  };
}

function normalizeOptionalString(value: unknown): unknown {
  if (typeof value !== "string") {
    return value;
  }

  const trimmed = value.trim();
  return trimmed === "" ? undefined : trimmed;
}

const envSchema = z.object({
  PORT: z.coerce.number().int().positive().default(3000),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  STORAGE_DRIVER: z.enum(["memory", "postgres"]).default("memory"),
  DATABASE_URL: z.preprocess(normalizeOptionalString, z.string().min(1).optional()),
  LLM_PROVIDER: z.enum(["placeholder", "openai-compatible"]).default("placeholder"),
  LLM_BASE_URL: z.string().url().default("https://api.openai.com/v1"),
  LLM_API_KEY: z.preprocess(normalizeOptionalString, z.string().min(1).optional()),
  LLM_MODEL: z.string().default("gpt-4.1-mini"),
  LLM_TIMEOUT_MS: z.coerce.number().int().positive().default(30000)
}).superRefine((env, context) => {
  if (env.STORAGE_DRIVER === "postgres" && !env.DATABASE_URL) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["DATABASE_URL"],
      message: "DATABASE_URL is required when STORAGE_DRIVER=postgres"
    });
  }

  if (env.LLM_PROVIDER === "openai-compatible" && !env.LLM_API_KEY) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["LLM_API_KEY"],
      message: "LLM_API_KEY is required when LLM_PROVIDER=openai-compatible"
    });
  }
});

export type AppConfig = z.infer<typeof envSchema>;

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  return envSchema.parse(mergeEnv(env));
}

export function isLiveLlmConfigured(config: AppConfig): boolean {
  return config.LLM_PROVIDER === "openai-compatible" && Boolean(config.LLM_API_KEY);
}
