import { beforeEach, describe, expect, it } from "vitest";
import { InMemoryLogger } from "../../lib/in-memory-logger";
import type { Message } from "../agent/types";
import { InMemoryAIProvider } from "../ai-provider/in-memory-provider";
import { createCodingSkill } from "./skill";

describe("CodingSkill", () => {
  const logger = new InMemoryLogger();
  const aiProvider = new InMemoryAIProvider();

  beforeEach(() => {
    logger.clear();
    aiProvider.clear();
  });

  it("should return generated content when successful", async () => {
    const expectedContent = "Generated code";
    aiProvider.setResponses([expectedContent]);

    const skill = createCodingSkill({
      apiKey: "test-api-key",
      logger,
      aiAdapter: {
        generateContent: async (content: string) => {
          return await aiProvider.generateResponse([{ role: "user", content }]);
        },
      },
    });

    const message: Message = { content: "test prompt", role: "user" };
    const response = await skill(message);

    expect(response).toEqual({
      content: expectedContent,
      type: "text",
    });
    expect(logger.getErrors()).toHaveLength(0);
  });

  it("should return error response when generation fails", async () => {
    aiProvider.setResponses([]);
    aiProvider.setError(new Error("Generation failed"));

    const skill = createCodingSkill({
      apiKey: "test-api-key",
      logger,
      aiAdapter: {
        generateContent: async (content: string) => {
          return await aiProvider.generateResponse([{ role: "user", content }]);
        },
      },
    });

    const message: Message = { content: "test prompt", role: "user" };
    const response = await skill(message);

    expect(response).toEqual({
      content: "Sorry, I encountered an error while processing your coding request.",
      type: "error",
    });
    expect(logger.getErrors()).toHaveLength(1);
    expect(logger.getErrors()[0]).toContain("Error generating code:");
  });
});
