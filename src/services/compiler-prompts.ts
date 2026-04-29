import type { DocumentRecord, PageType, SourceRefRecord } from "../domain/types.js";
import type { ModelMessage } from "../llm/types.js";

export interface CompiledPageResponse {
  summary: string;
  pageType: PageType;
  bodyMarkdown: string;
  sourceRefs: SourceRefRecord[];
  outboundLinks: string[];
}

export function buildCompilationPrompt(document: DocumentRecord): ModelMessage[] {
  return [
    {
      role: "system",
      content: [
        "You are compiling source material into a durable wiki page.",
        "Return only valid JSON.",
        "Write for a knowledge base, not a chat reply.",
        "Use only information supported by the source material.",
        "If you mention a related page title, include it in outboundLinks using exact title casing from the source when possible.",
        "sourceRefs should be short human-readable anchors from the source, not fabricated URLs.",
        "The JSON shape must be:",
        "{",
        '  "summary": "short summary",',
        '  "pageType": "entity|topic|timeline",',
        '  "bodyMarkdown": "full markdown page",',
        '  "sourceRefs": [{"label": "short anchor", "excerpt": "supporting quote or fragment"}],',
        '  "outboundLinks": ["related page titles"]',
        "}",
        "bodyMarkdown should include these sections when relevant: Overview, Key Points, Related Pages, Source Notes.",
        "sourceRefs should point to concrete supporting fragments from the source text, preferably sentence-level or clause-level snippets.",
        "Ground the page in the source material. Do not invent citations."
      ].join("\n")
    },
    {
      role: "user",
      content: [
        `Document title: ${document.title}`,
        `Source type: ${document.sourceType}`,
        `Known metadata: ${JSON.stringify(document.metadata)}`,
        "",
        "Document content:",
        document.rawContent
      ].join("\n")
    }
  ];
}
