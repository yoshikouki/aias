import { describe, expect, it, vi } from "vitest";
import type { RateLimitConfig } from "../rate-limit/types";
import { createRateLimitedAIProvider } from "./rate-limited-provider";
import type { AIProvider, Message } from "./types";

describe("RateLimitedAIProvider", () => {
  const mockMessages: Message[] = [
    { role: "user", content: "Hello" },
    { role: "assistant", content: "Hi there!" },
  ];

  const mockProvider: AIProvider = {
    generateResponse: vi.fn().mockResolvedValue("Mock response"),
  };

  const rateLimitConfig: RateLimitConfig = {
    maxRequests: 2,
    windowMs: 1000,
  };

  it("allows requests within rate limit", async () => {
    const provider = createRateLimitedAIProvider(mockProvider, rateLimitConfig, "test-key");
    const response = await provider.generateResponse(mockMessages);
    expect(response).toBe("Mock response");
    expect(mockProvider.generateResponse).toHaveBeenCalledWith(mockMessages);
  });

  it("throws error when rate limit is exceeded", async () => {
    const provider = createRateLimitedAIProvider(mockProvider, rateLimitConfig, "test-key");

    // First two requests should succeed
    await provider.generateResponse(mockMessages);
    await provider.generateResponse(mockMessages);

    // Third request should fail
    await expect(provider.generateResponse(mockMessages)).rejects.toThrow(
      /Rate limit exceeded/,
    );
  });

  it("uses different rate limit keys for different instances", async () => {
    const provider1 = createRateLimitedAIProvider(mockProvider, rateLimitConfig, "key1");
    const provider2 = createRateLimitedAIProvider(mockProvider, rateLimitConfig, "key2");

    // Both should be able to make requests up to their limit
    await provider1.generateResponse(mockMessages);
    await provider1.generateResponse(mockMessages);
    await provider2.generateResponse(mockMessages);
    await provider2.generateResponse(mockMessages);

    // Both should fail after their limit
    await expect(provider1.generateResponse(mockMessages)).rejects.toThrow(
      /Rate limit exceeded/,
    );
    await expect(provider2.generateResponse(mockMessages)).rejects.toThrow(
      /Rate limit exceeded/,
    );
  });
});
