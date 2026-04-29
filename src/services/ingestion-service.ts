import type { DocumentRecord, JobRecord, SourceType } from "../domain/types.js";
import { createId } from "../lib/id.js";
import type { RepositoryBundle } from "../repositories/interfaces.js";

interface CreateDocumentInput {
  sourceType: SourceType;
  title: string;
  rawContent: string;
  metadata?: Record<string, string>;
}

export class IngestionService {
  constructor(private readonly repositories: RepositoryBundle) {}

  async createDocument(input: CreateDocumentInput): Promise<{ document: DocumentRecord; job: JobRecord }> {
    const now = new Date().toISOString();
    const document: DocumentRecord = {
      id: createId("doc"),
      sourceType: input.sourceType,
      title: input.title,
      rawContent: input.rawContent,
      metadata: input.metadata ?? {},
      status: "queued",
      createdAt: now,
      updatedAt: now
    };

    const job: JobRecord = {
      id: createId("job"),
      jobType: "compile-document",
      payload: { documentId: document.id },
      status: "queued",
      createdAt: now,
      updatedAt: now
    };

    await this.repositories.documents.create(document);
    await this.repositories.jobs.create(job);

    return { document, job };
  }

  async enqueueRecompile(documentId: string): Promise<JobRecord | undefined> {
    const document = await this.repositories.documents.getById(documentId);
    if (!document) {
      return undefined;
    }

    const now = new Date().toISOString();
    const job: JobRecord = {
      id: createId("job"),
      jobType: "compile-document",
      payload: { documentId: document.id },
      status: "queued",
      createdAt: now,
      updatedAt: now
    };

    await this.repositories.documents.updateStatus(document.id, "queued");
    await this.repositories.jobs.create(job);
    return job;
  }
}
