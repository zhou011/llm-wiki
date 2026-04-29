import type { LintFinding, LintFindingType, LintReport, LintSeverity, QaRecord, WikiPageRecord } from "../domain/types.js";
import { createId } from "../lib/id.js";
import type { RepositoryBundle } from "../repositories/interfaces.js";
import { SchemaService } from "./schema-service.js";

function normalizeTitle(value: string): string {
  return value.trim().toLowerCase();
}

type DraftFinding = {
  findingType: LintFindingType;
  severity: LintSeverity;
  message: string;
  pageSlug?: string;
  queryId?: string;
  metadata?: Record<string, string>;
};

export class LintService {
  private readonly schemaService = new SchemaService();

  constructor(private readonly repositories: RepositoryBundle) {}

  async run(): Promise<{ report: LintReport; findings: LintFinding[] }> {
    const schema = await this.schemaService.getWikiSchema();
    const pages = await this.repositories.wiki.listPages();
    const queries = await this.repositories.queries.list(500);
    const findings = await this.buildFindings(pages, queries, schema.lintRules.minimumSourceRefsPerPage, schema.lintRules.highQueryLowCoverageThreshold);

    const now = new Date().toISOString();
    const report = await this.repositories.lint.createReport({
      id: createId("lint"),
      status: "completed",
      findingCount: 0,
      createdAt: now,
      updatedAt: now
    });

    const persistedFindings: LintFinding[] = [];
    for (const finding of findings) {
      persistedFindings.push(await this.repositories.lint.addFinding({
        id: createId("finding"),
        reportId: report.id,
        findingType: finding.findingType,
        severity: finding.severity,
        message: finding.message,
        pageSlug: finding.pageSlug,
        queryId: finding.queryId,
        metadata: finding.metadata ?? {},
        createdAt: now
      }));
    }

    const hydratedReport = await this.repositories.lint.getReportById(report.id);
    return {
      report: hydratedReport ?? report,
      findings: persistedFindings
    };
  }

  private async buildFindings(
    pages: WikiPageRecord[],
    queries: QaRecord[],
    minimumSourceRefsPerPage: number,
    highQueryThreshold: number
  ): Promise<DraftFinding[]> {
    const findings: DraftFinding[] = [];
    const pageBySlug = new Map(pages.map((page) => [page.slug, page]));
    const inboundCounts = new Map<string, number>();

    for (const page of pages) {
      for (const targetTitle of page.outboundLinks ?? []) {
        const target = pages.find((candidate) => candidate.title === targetTitle);
        if (!target) {
          continue;
        }

        inboundCounts.set(target.slug, (inboundCounts.get(target.slug) ?? 0) + 1);
      }
    }

    for (const page of pages) {
      const sourceRefCount = page.sourceRefs?.length ?? 0;
      if (sourceRefCount < minimumSourceRefsPerPage) {
        findings.push({
          findingType: "weak-sourcing",
          severity: "medium",
          message: `Page "${page.title}" has only ${sourceRefCount} source reference(s).`,
          pageSlug: page.slug,
          metadata: {
            sourceRefCount: String(sourceRefCount)
          }
        });
      }

      const outboundCount = page.outboundLinks?.length ?? 0;
      const inboundCount = inboundCounts.get(page.slug) ?? 0;
      if (outboundCount === 0 && inboundCount === 0) {
        findings.push({
          findingType: "orphan-page",
          severity: "low",
          message: `Page "${page.title}" has no inbound or outbound links.`,
          pageSlug: page.slug
        });
      }
    }

    const titleGroups = new Map<string, WikiPageRecord[]>();
    for (const page of pages) {
      const key = normalizeTitle(page.title);
      const group = titleGroups.get(key) ?? [];
      group.push(page);
      titleGroups.set(key, group);
    }

    for (const group of titleGroups.values()) {
      if (group.length > 1) {
        for (const page of group) {
          findings.push({
            findingType: "duplicate-topic",
            severity: "medium",
            message: `Page title "${page.title}" appears multiple times.`,
            pageSlug: page.slug
          });
        }
      }
    }

    const queryGroups = new Map<string, QaRecord[]>();
    for (const query of queries) {
      const group = queryGroups.get(query.normalizedQuestion) ?? [];
      group.push(query);
      queryGroups.set(query.normalizedQuestion, group);
    }

    for (const group of queryGroups.values()) {
      if (group.length < highQueryThreshold) {
        continue;
      }

      const latest = group[0];
      const supportingSlugs = new Set(group.flatMap((query) => query.supportingPageSlugs));
      const hasFaqCoverage = pages.some((page) => page.pageType === "faq" && normalizeTitle(page.title).includes(normalizeTitle(latest.question)));

      if (supportingSlugs.size <= 1 && !hasFaqCoverage) {
        findings.push({
          findingType: "high-query-low-coverage",
          severity: "high",
          message: `Question "${latest.question}" appears ${group.length} times without dedicated FAQ coverage.`,
          queryId: latest.id,
          metadata: {
            normalizedQuestion: latest.normalizedQuestion,
            occurrenceCount: String(group.length),
            supportingPageCount: String(supportingSlugs.size)
          }
        });
      }
    }

    void pageBySlug;
    return findings;
  }
}
