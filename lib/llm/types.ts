export interface LlmMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface LlmGenerateOptions {
  temperature?: number;
  maxTokens?: number;
}

export interface LlmClient {
  generate(messages: LlmMessage[], options?: LlmGenerateOptions): Promise<string>;
}
