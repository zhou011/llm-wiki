import type {
  GenerateTextInput,
  GenerateTextOutput,
  LanguageModelClient
} from "./types.js";

export class PlaceholderLanguageModelClient implements LanguageModelClient {
  async generateText(input: GenerateTextInput): Promise<GenerateTextOutput> {
    const prompt = input.messages.at(-1)?.content ?? "";
    return {
      text: JSON.stringify({
        summary: prompt.slice(0, 180),
        pageType: "topic",
        bodyMarkdown: "# Placeholder Output\n\nNo live LLM is configured yet.",
        sourceRefs: [],
        outboundLinks: []
      }),
      raw: null
    };
  }
}
