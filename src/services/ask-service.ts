import type { AnswerEvidenceRecord, WikiPageRecord } from "../domain/types.js";
import type { RepositoryBundle } from "../repositories/interfaces.js";
import type { AnswerSynthesizer } from "./answer-synthesizer.js";

const stopWords = new Set([
  "a",
  "an",
  "and",
  "are",
  "do",
  "does",
  "for",
  "how",
  "i",
  "in",
  "is",
  "it",
  "of",
  "on",
  "or",
  "tell",
  "the",
  "to",
  "what",
  "why"
]);

function tokenizeQuestion(question: string): string[] {
  return Array.from(
    new Set(
      question
        .toLowerCase()
        .split(/[^a-z0-9]+/)
        .map((token) => token.trim())
        .filter((token) => token.length >= 2 && !stopWords.has(token))
    )
  );
}

function scorePage(tokens: string[], page: WikiPageRecord): number {
  const title = page.title.toLowerCase();
  const summary = page.summary.toLowerCase();
  const body = page.bodyMarkdown.toLowerCase();
  const related = (page.outboundLinks ?? []).join(" ").toLowerCase();

  let score = 0;
  for (const token of tokens) {
    if (title.includes(token)) {
      score += 5;
    }
    if (summary.includes(token)) {
      score += 3;
    }
    if (body.includes(token)) {
      score += 1;
    }
    if (related.includes(token)) {
      score += 2;
    }
  }

  return score;
}

function passesRecallThreshold(score: number, tokenCount: number): boolean {
  if (tokenCount <= 1) {
    return score >= 2;
  }

  return score >= 3;
}

function scoreExcerpt(tokens: string[], excerpt: string, label: string): number {
  const normalizedExcerpt = excerpt.toLowerCase();
  const normalizedLabel = label.toLowerCase();

  let score = 0;
  for (const token of tokens) {
    if (normalizedLabel.includes(token)) {
      score += 2;
    }
    if (normalizedExcerpt.includes(token)) {
      score += 4;
    }
  }

  return score;
}

function rankEvidencePages(
  pages: Array<{ page: WikiPageRecord; score: number }>
): Array<{ page: WikiPageRecord; score: number }> {
  return [...pages].sort((left, right) => {
    const scoreDelta = right.score - left.score;
    if (scoreDelta !== 0) {
      return scoreDelta;
    }

    const evidenceDelta = (right.page.sourceRefs ?? []).length - (left.page.sourceRefs ?? []).length;
    if (evidenceDelta !== 0) {
      return evidenceDelta;
    }

    return left.page.title.localeCompare(right.page.title);
  });
}

function trimWeakEvidence(
  pages: Array<{ page: WikiPageRecord; score: number }>
): Array<{ page: WikiPageRecord; score: number }> {
  const withSourceRefs = pages.filter((entry) => (entry.page.sourceRefs ?? []).length > 0);
  if (withSourceRefs.length >= 2) {
    return withSourceRefs;
  }

  return pages;
}

export class AskService {
  constructor(
    private readonly repositories: RepositoryBundle,
    private readonly synthesizer: AnswerSynthesizer
  ) {}

  async answer(question: string): Promise<{
    answer: string;
    evidence: AnswerEvidenceRecord[];
    supportingPages: WikiPageRecord[];
  }> {
    const pages = await this.repositories.wiki.listPages();
    const tokens = tokenizeQuestion(question);
    const scoringTokens = tokens.length > 0 ? tokens : question
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .map((token) => token.trim())
      .filter(Boolean);
    const scoredPages = pages
      .map((page) => ({
        page,
        score: scorePage(scoringTokens, page)
      }))
      .filter((entry) => passesRecallThreshold(entry.score, scoringTokens.length))
      .slice(0, 5);
    const rankedEvidence = trimWeakEvidence(rankEvidencePages(scoredPages))
      .slice(0, 3);
    const supportingPages = rankedEvidence.map((entry) => entry.page);

    if (supportingPages.length === 0) {
      return {
        answer: "No compiled wiki pages match the current question yet.",
        evidence: [],
        supportingPages: []
      };
    }

    const topEvidence = supportingPages
      .flatMap((page) => {
        const match = rankedEvidence.find((candidate) => candidate.page.slug === page.slug);
        const pageScore = match?.score ?? 0;
        const sourceRefs = page.sourceRefs ?? [];

        if (sourceRefs.length > 0) {
          return sourceRefs.map((sourceRef) => ({
            pageTitle: page.title,
            pageSlug: page.slug,
            sourceLabel: sourceRef.label,
            excerpt: sourceRef.excerpt,
            score: pageScore + scoreExcerpt(scoringTokens, sourceRef.excerpt, sourceRef.label)
          }));
        }

        return [{
          pageTitle: page.title,
          pageSlug: page.slug,
          sourceLabel: `${page.title}#summary`,
          excerpt: page.summary,
          score: pageScore + scoreExcerpt(scoringTokens, page.summary, `${page.title}#summary`)
        }];
      })
      .sort((left, right) => (right.score ?? 0) - (left.score ?? 0))
      .slice(0, 8);

    const synthesized = await this.synthesizer.synthesize(question, supportingPages, topEvidence);

    return {
      answer: synthesized.answer,
      evidence: topEvidence,
      supportingPages
    };
  }
}
