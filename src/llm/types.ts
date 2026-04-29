export interface ModelMessage {
  role: "system" | "user";
  content: string;
}

export interface GenerateTextInput {
  messages: ModelMessage[];
  temperature?: number;
}

export interface GenerateTextOutput {
  text: string;
  raw: unknown;
}

export interface LanguageModelClient {
  generateText(input: GenerateTextInput): Promise<GenerateTextOutput>;
}
