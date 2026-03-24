import type { ChatMessage, ChatCompletionResponse } from "./types.js";

export interface AIClientConfig {
  baseUrl: string;
  apiKey: string;
  model: string;
}

export class AIClient {
  private baseUrl: string;
  private apiKey: string;
  private model: string;

  constructor(config: AIClientConfig) {
    this.baseUrl = config.baseUrl.replace(/\/+$/, "");
    this.apiKey = config.apiKey;
    this.model = config.model;
  }

  async chat(messages: ChatMessage[]): Promise<string> {
    const url = `${this.baseUrl}/chat/completions`;

    const body: Record<string, unknown> = {
      model: this.model,
      messages,
      temperature: 0.3,
    };

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      throw new Error(
        `AI API request failed (${response.status}): ${text || response.statusText}`,
      );
    }

    const data = (await response.json()) as ChatCompletionResponse;

    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error("AI API returned an empty response");
    }

    return content;
  }
}
