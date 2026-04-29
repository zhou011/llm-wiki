import { z } from "zod";
import type { DocumentRecord, PageType, SourceRefRecord } from "../domain/types.js";
import { extractJsonObject } from "../lib/json.js";
import type { LanguageModelClient } from "../llm/types.js";
import {
  buildCompilationPrompt,
  type CompiledPageResponse
} from "./compiler-prompts.js";

export interface CompiledPageDraft {
  title: string;
  pageType: PageType;
  summary: string;
  bodyMarkdown: string;
  sourceRefs: SourceRefRecord[];
  outboundLinks: string[];
}

export interface KnowledgeCompiler {
  compile(document: DocumentRecord): Promise<CompiledPageDraft>;
}

const compiledPageSchema = z.object({
  summary: z.string().min(1),
  pageType: z.enum(["entity", "topic", "timeline"]),
  bodyMarkdown: z.string().min(1),
  sourceRefs: z.array(z.union([
    z.object({
      label: z.string().min(1),
      excerpt: z.string().min(1)
    }),
    z.string().min(1)
  ])).default([]),
  outboundLinks: z.array(z.string()).default([])
});

function extractPlaceholderOutboundLinks(title: string, rawContent: string): string[] {
  const matches = rawContent.match(/\bPage [A-Z][A-Za-z0-9_-]*\b/g) ?? [];
  return Array.from(
    new Set(
      matches
        .map((match) => match.trim())
        .filter((match) => match !== title)
    )
  );
}

function buildPlaceholderSourceRefs(document: DocumentRecord): SourceRefRecord[] {
  const fragments = document.rawContent
    .split(/(?<=[.!?])\s+/)
    .map((fragment) => fragment.trim())
    .filter(Boolean)
    .slice(0, 3);

  if (fragments.length === 0) {
    return [];
  }

  return fragments.map((fragment, index) => ({
    label: `${document.title}#${index + 1}`,
    excerpt: fragment
  }));
}

function normalizeSourceRefs(sourceRefs: Array<SourceRefRecord | string>): SourceRefRecord[] {
  return sourceRefs.map((sourceRef, index) => {
    if (typeof sourceRef === "string") {
      return {
        label: `source#${index + 1}`,
        excerpt: sourceRef
      };
    }

    return sourceRef;
  });
}

export class PlaceholderKnowledgeCompiler implements KnowledgeCompiler {
  async compile(document: DocumentRecord): Promise<CompiledPageDraft> {
    const summary = document.rawContent.slice(0, 180);
    const outboundLinks = extractPlaceholderOutboundLinks(document.title, document.rawContent);
    const sourceRefs = buildPlaceholderSourceRefs(document);
    const bodyMarkdown = [
      `# ${document.title}`,
      "",
      "## Source Summary",
      summary,
      "",
      "## Related Pages",
      outboundLinks.length > 0 ? outboundLinks.map((link) => `- ${link}`).join("\n") : "None detected.",
      "",
      "## Source Notes",
      sourceRefs.length > 0 ? sourceRefs.map((ref) => `- ${ref.label}: ${ref.excerpt}`).join("\n") : "No source notes captured.",
      "",
      "## Raw Excerpt",
      document.rawContent.slice(0, 1000)
    ].join("\n");

    return {
      title: document.title,
      pageType: "topic",
      summary,
      bodyMarkdown,
      sourceRefs,
      outboundLinks
    };
  }
}

export class LlmKnowledgeCompiler implements KnowledgeCompiler {
  constructor(private readonly client: LanguageModelClient) {}

  async compile(document: DocumentRecord): Promise<CompiledPageDraft> {
    const response = await this.client.generateText({
      messages: buildCompilationPrompt(document),
      temperature: 0.1
    });

    const parsed = compiledPageSchema.parse(
      JSON.parse(extractJsonObject(response.text)) as CompiledPageResponse
    );

    return {
      title: document.title,
      pageType: parsed.pageType,
      summary: parsed.summary,
      bodyMarkdown: parsed.bodyMarkdown,
      sourceRefs: normalizeSourceRefs(parsed.sourceRefs),
      outboundLinks: parsed.outboundLinks
    };
  }
}

export class ResilientKnowledgeCompiler implements KnowledgeCompiler {
  constructor(
    private readonly primary: KnowledgeCompiler,
    private readonly fallback: KnowledgeCompiler
  ) {}

  async compile(document: DocumentRecord): Promise<CompiledPageDraft> {
    try {
      return await this.primary.compile(document);
    } catch (error) {
      console.error("Falling back to placeholder compiler:", error);
      return this.fallback.compile(document);
    }
  }
}
