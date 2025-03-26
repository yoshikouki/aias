import { describe, expect, it } from "vitest";
import { AnthropicProvider, GoogleAIProvider, createAIProvider } from "./provider";
import type { AIProviderConfig, Message } from "./types";

describe("AIProvider", () => {
  const mockConfig: AIProviderConfig = {
    apiKey: "test-api-key",
    model: "test-model",
    temperature: 0.5,
  };

  const mockMessages: Message[] = [
    { role: "user", content: "Hello" },
    { role: "assistant", content: "Hi there!" },
  ];

  describe("createAIProvider", () => {
    it("creates AnthropicProvider when type is anthropic", () => {
      const provider = createAIProvider("anthropic", mockConfig);
      expect(provider).toBeInstanceOf(AnthropicProvider);
    });

    it("creates GoogleAIProvider when type is google", () => {
      const provider = createAIProvider("google", mockConfig);
      expect(provider).toBeInstanceOf(GoogleAIProvider);
    });

    it("throws error for unsupported provider type", () => {
      // @ts-expect-error - Testing invalid type
      expect(() => createAIProvider("invalid", mockConfig)).toThrow(
        "Unsupported AI provider type: invalid",
      );
    });
  });

  describe("AnthropicProvider", () => {
    it("initializes with default values when not provided", () => {
      const provider = new AnthropicProvider({ apiKey: "test-api-key" });
      expect(provider).toBeInstanceOf(AnthropicProvider);
    });

    it("initializes with provided values", () => {
      const provider = new AnthropicProvider(mockConfig);
      expect(provider).toBeInstanceOf(AnthropicProvider);
    });
  });

  describe("GoogleAIProvider", () => {
    it("initializes with default values when not provided", () => {
      const provider = new GoogleAIProvider({ apiKey: "test-api-key" });
      expect(provider).toBeInstanceOf(GoogleAIProvider);
    });

    it("initializes with provided values", () => {
      const provider = new GoogleAIProvider(mockConfig);
      expect(provider).toBeInstanceOf(GoogleAIProvider);
    });
  });
});
