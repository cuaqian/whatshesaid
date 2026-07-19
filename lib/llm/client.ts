import type { LlmClient, LlmGenerateOptions, LlmMessage } from "./types";

class OpenAiCompatibleClient implements LlmClient {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly model: string;

  constructor() {
    this.apiKey = process.env.OPENAI_API_KEY ?? "";
    this.baseUrl = process.env.OPENAI_BASE_URL ?? "https://api.openai.com/v1";
    this.model = process.env.OPENAI_MODEL ?? "gpt-4o-mini";
  }

  async generate(messages: LlmMessage[], options: LlmGenerateOptions = {}): Promise<string> {
    if (!this.apiKey) {
      throw new Error("OPENAI_API_KEY is not configured");
    }

    const response = await fetch(`${this.baseUrl.replace(/\/$/, "")}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`
      },
      body: JSON.stringify({
        model: this.model,
        messages,
        temperature: options.temperature ?? 0.2,
        max_tokens: options.maxTokens ?? 160
      })
    });

    if (!response.ok) {
      throw new Error(`LLM request failed: ${response.status}`);
    }

    const data = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
    return data.choices?.[0]?.message?.content?.trim() ?? "";
  }
}

export function isDemoMode(): boolean {
  return process.env.DEMO_MODE === "1" || !process.env.OPENAI_API_KEY;
}

export function createLlmClient(): LlmClient {
  return new OpenAiCompatibleClient();
}
