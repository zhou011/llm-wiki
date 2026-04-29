import type { PageType, SourceRefRecord, WikiPageRecord } from "../domain/types.js";
import { createId } from "../lib/id.js";
import { slugify } from "../lib/slug.js";
import type { RepositoryBundle } from "../repositories/interfaces.js";

export class WikiService {
  constructor(private readonly repositories: RepositoryBundle) {}

  async listPages(): Promise<WikiPageRecord[]> {
    const pages = await this.repositories.wiki.listPages();
    const titleIndex = new Map(pages.map((page) => [page.id, page.title]));
    return Promise.all(pages.map((page) => this.withResolvedOutboundLinks(page, titleIndex)));
  }

  async getPage(slug: string): Promise<WikiPageRecord | undefined> {
    const page = await this.repositories.wiki.getPageBySlug(slug);
    if (!page) {
      return undefined;
    }

    const allPages = await this.repositories.wiki.listPages();
    const titleIndex = new Map(allPages.map((candidate) => [candidate.id, candidate.title]));
    return this.withResolvedOutboundLinks(page, titleIndex);
  }

  async upsertTopicPage(
    title: string,
    pageType: PageType,
    bodyMarkdown: string,
    summary: string,
    sourceRefs: SourceRefRecord[] = [],
    outboundLinks: string[] = []
  ): Promise<WikiPageRecord> {
    const slug = slugify(title);
    const now = new Date().toISOString();
    const existing = await this.repositories.wiki.getPageBySlug(slug);
    if (existing) {
      const nextRevision = existing.revision + 1;
      const updated = await this.repositories.wiki.updatePage(existing.id, {
        title,
        pageType,
        bodyMarkdown,
        summary,
        sourceRefs,
        outboundLinks,
        revision: nextRevision
      });

      if (updated) {
        await this.repositories.wiki.addRevision({
          id: createId("rev"),
          pageId: updated.id,
          revision: nextRevision,
          summary: updated.summary,
          bodyMarkdown: updated.bodyMarkdown,
          sourceRefs: updated.sourceRefs ?? [],
          createdAt: now
        });
        await this.syncOutboundLinks(updated.id, outboundLinks, now);
      }

      return updated ?? existing;
    }

    const page: WikiPageRecord = {
      id: createId("page"),
      slug,
      title,
      pageType,
      summary,
      bodyMarkdown,
      sourceRefs,
      outboundLinks,
      revision: 1,
      createdAt: now,
      updatedAt: now
    };

    await this.repositories.wiki.createPage(page);
    await this.repositories.wiki.addRevision({
      id: createId("rev"),
      pageId: page.id,
      revision: page.revision,
      summary: page.summary,
      bodyMarkdown: page.bodyMarkdown,
      sourceRefs: page.sourceRefs ?? [],
      createdAt: now
    });
    await this.syncOutboundLinks(page.id, outboundLinks, now);

    return page;
  }

  private async syncOutboundLinks(
    sourcePageId: string,
    outboundLinks: string[],
    createdAt: string
  ): Promise<void> {
    const uniqueTitles = Array.from(new Set(outboundLinks.map((title) => title.trim()).filter(Boolean)));
    const linkRecords = [];

    for (const title of uniqueTitles) {
      const target = await this.repositories.wiki.getPageByTitle(title);
      if (!target) {
        continue;
      }

      linkRecords.push({
        id: createId("link"),
        sourcePageId,
        targetPageId: target.id,
        relationship: "related",
        createdAt
      });
    }

    await this.repositories.wiki.replaceLinksForPage(sourcePageId, linkRecords);
  }

  private async withResolvedOutboundLinks(
    page: WikiPageRecord,
    titleIndex: Map<string, string>
  ): Promise<WikiPageRecord> {
    const links = await this.repositories.wiki.listLinksFromPage(page.id);
    if (links.length === 0) {
      return {
        ...page,
        outboundLinks: []
      };
    }

    return {
      ...page,
      outboundLinks: links
        .map((link) => titleIndex.get(link.targetPageId))
        .filter((title): title is string => Boolean(title))
    };
  }
}
