import { describe, expect, it, vi } from "vitest";
import type { Message } from "../agent/types";
import { createCodingSkill } from "./skill";

describe("CodingSkill", () => {
  const mockLogger = {
    log: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  };

  const mockAiAdapter = {
    generateContent: vi.fn(),
  };

  it("should return generated content when successful", async () => {
    const expectedContent = "Generated code";
    mockAiAdapter.generateContent.mockResolvedValue(expectedContent);

    const skill = createCodingSkill({
      apiKey: "test-api-key",
      logger: mockLogger,
      aiAdapter: mockAiAdapter,
    });
    const message: Message = { content: "test prompt", role: "user" };
    const response = await skill(message);

    expect(response).toEqual({
      content: expectedContent,
      type: "text",
    });
  });

  it("should return error response when generation fails", async () => {
    mockAiAdapter.generateContent.mockRejectedValue(new Error("Generation failed"));

    const skill = createCodingSkill({
      apiKey: "test-api-key",
      logger: mockLogger,
      aiAdapter: mockAiAdapter,
    });
    const message: Message = { content: "test prompt", role: "user" };
    const response = await skill(message);

    expect(response).toEqual({
      content: "Sorry, I encountered an error while processing your coding request.",
      type: "error",
    });
  });
});
