import type { AnswerEvidenceRecord, WikiPageRecord } from "../domain/types.js";
import type { ModelMessage } from "../llm/types.js";

function formatSourceRefs(page: WikiPageRecord): string {
  const refs = page.sourceRefs ?? [];
  if (refs.length === 0) {
    return "None";
  }

  return refs
    .map((ref) => `${ref.label}: ${ref.excerpt}`)
    .join(" | ");
}

export function buildAskPrompt(
  question: string,
  pages: WikiPageRecord[],
  evidence: AnswerEvidenceRecord[]
): ModelMessage[] {
  const evidenceContext = evidence
    .slice(0, 8)
    .map((entry) => `- ${entry.pageTitle} (${entry.sourceLabel}): ${entry.excerpt}`)
    .join("\n");

  const context = pages.map((page) => {
    return [
      `Title: ${page.title}`,
      `Type: ${page.pageType}`,
      `Summary: ${page.summary}`,
      `Source refs: ${formatSourceRefs(page)}`,
      `Related pages: ${(page.outboundLinks ?? []).join(" | ") || "None"}`,
      "Body:",
      page.bodyMarkdown
    ].join("\n");
  }).join("\n\n---\n\n");

  return [
    {
      role: "system",
      content: [
        "You answer questions from compiled wiki pages.",
        "Prefer the wiki context over generic world knowledge.",
        "If the pages are insufficient, say what is missing.",
        "Prefer the most relevant evidence excerpts when they directly answer the question.",
        "When useful, mention which wiki pages support the answer.",
        "Return JSON when possible with the shape {\"answer\": \"...\"}."
      ].join("\n")
    },
    {
      role: "user",
      content: [
        `Question: ${question}`,
        "",
        "Top evidence excerpts:",
        evidenceContext || "None",
        "",
        "Wiki context:",
        context
      ].join("\n")
    }
  ];
}
