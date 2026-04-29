import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import type { WikiSchema } from "../domain/types.js";

const currentDir = dirname(fileURLToPath(import.meta.url));
const schemaPath = join(currentDir, "../../config/wiki-schema.json");

const wikiSchemaSchema = z.object({
  pageTypes: z.record(z.enum(["entity", "topic", "timeline", "faq", "comparison", "concept", "index"]), z.object({
    requiredSections: z.array(z.string().min(1)).min(1),
    createWhen: z.string().min(1)
  })),
  writeBackRules: z.object({
    faqQuestionRepeatThreshold: z.number().int().positive(),
    comparisonSupportingPageThreshold: z.number().int().positive(),
    minimumEvidenceCount: z.number().int().positive()
  }),
  lintRules: z.object({
    minimumSourceRefsPerPage: z.number().int().nonnegative(),
    highQueryLowCoverageThreshold: z.number().int().positive(),
    flagOrphanPages: z.boolean(),
    flagWeakSourcing: z.boolean(),
    flagDuplicateTitles: z.boolean()
  })
});

export class SchemaService {
  private cachedSchema?: WikiSchema;

  async getWikiSchema(): Promise<WikiSchema> {
    if (this.cachedSchema) {
      return this.cachedSchema;
    }

    const raw = await readFile(schemaPath, "utf8");
    const parsed = wikiSchemaSchema.parse(JSON.parse(raw)) as WikiSchema;
    this.cachedSchema = parsed;
    return parsed;
  }
}
