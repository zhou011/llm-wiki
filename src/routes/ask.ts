import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { createAnswerSynthesizer } from "../services/answer-factory.js";
import { AskService } from "../services/ask-service.js";

const askSchema = z.object({
  question: z.string().min(1)
});

export async function registerAskRoutes(app: FastifyInstance): Promise<void> {
  app.post("/ask", async (request, reply) => {
    const parsed = askSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({
        error: "Invalid question payload",
        issues: parsed.error.flatten()
      });
    }

    const askService = new AskService(
      app.repositories,
      createAnswerSynthesizer(app.config)
    );
    const answer = await askService.answer(parsed.data.question);
    return reply.send(answer);
  });
}
