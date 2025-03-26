import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { generateText } from "ai";
import type { AIProvider, AIProviderConfig, Message } from "./types";

/**
 * Anthropicを利用したAIプロバイダーの実装
 */
export class AnthropicProvider implements AIProvider {
  private anthropic: ReturnType<typeof createAnthropic>;
  private model: string;
  private temperature: number;

  constructor(config: AIProviderConfig) {
    this.anthropic = createAnthropic({ apiKey: config.apiKey });
    this.model = config.model ?? "claude-3-7-sonnet-20250219";
    this.temperature = config.temperature ?? 0.7;
  }

  async generateResponse(messages: Message[]): Promise<string> {
    const response = await generateText({
      model: this.anthropic(this.model),
      messages,
      temperature: this.temperature,
    });

    return response.text;
  }
}

/**
 * Google AI (Gemini) を利用したAIプロバイダーの実装
 */
export class GoogleAIProvider implements AIProvider {
  private google: ReturnType<typeof createGoogleGenerativeAI>;
  private model: string;
  private temperature: number;

  constructor(config: AIProviderConfig) {
    this.google = createGoogleGenerativeAI({ apiKey: config.apiKey });
    this.model = config.model ?? "gemini-2.0-flash";
    this.temperature = config.temperature ?? 0.7;
  }

  async generateResponse(messages: Message[]): Promise<string> {
    const response = await generateText({
      model: this.google(this.model),
      messages,
      temperature: this.temperature,
    });

    return response.text;
  }
}

/**
 * AIプロバイダーのファクトリー関数
 */
export function createAIProvider(
  type: "anthropic" | "google",
  config: AIProviderConfig,
): AIProvider {
  switch (type) {
    case "anthropic":
      return new AnthropicProvider(config);
    case "google":
      return new GoogleAIProvider(config);
    default:
      throw new Error(`Unsupported AI provider type: ${type}`);
  }
}
