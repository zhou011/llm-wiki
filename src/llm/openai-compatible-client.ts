import type { AppConfig } from "../config.js";
import type {
  GenerateTextInput,
  GenerateTextOutput,
  LanguageModelClient,
  ModelMessage
} from "./types.js";

interface OpenAICompatibleResponse {
  choices?: Array<{
    message?: {
      content?: string | Array<{ type?: string; text?: string }>;
    };
  }>;
}

function normalizeContent(messages: ModelMessage[]): Array<{ role: string; content: string }> {
  return messages.map((message) => ({
    role: message.role,
    content: message.content
  }));
}

function readContent(response: OpenAICompatibleResponse): string {
  const content = response.choices?.[0]?.message?.content;
  if (typeof content === "string") {
    return content;
  }

  if (Array.isArray(content)) {
    return content
      .map((part) => part.text ?? "")
      .join("")
      .trim();
  }

  throw new Error("Model response did not include text content");
}

export class OpenAICompatibleLanguageModelClient implements LanguageModelClient {
  constructor(private readonly config: AppConfig) {}

  async generateText(input: GenerateTextInput): Promise<GenerateTextOutput> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.config.LLM_TIMEOUT_MS);

    const response = await fetch(`${this.config.LLM_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${this.config.LLM_API_KEY}`
      },
      signal: controller.signal,
      body: JSON.stringify({
        model: this.config.LLM_MODEL,
        temperature: input.temperature ?? 0.2,
        messages: normalizeContent(input.messages)
      })
    }).finally(() => {
      clearTimeout(timeout);
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Model request failed with ${response.status}: ${body}`);
    }

    const payload = await response.json() as OpenAICompatibleResponse;
    return {
      text: readContent(payload),
      raw: payload
    };
  }
}
