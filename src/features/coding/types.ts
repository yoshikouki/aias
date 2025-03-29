import type { Message, Response } from "../agent/types";

export type GenerativeAIAdapter = {
  generateContent: (content: string) => Promise<string>;
};

export type CodingSkill = (message: Message) => Promise<Response>;
