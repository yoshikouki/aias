import { RateLimiter } from "../rate-limit/rate-limit";
import type { RateLimitConfig } from "../rate-limit/types";
import type { AIProvider, Message } from "./types";

/**
 * レートリミット付きのAIProviderラッパー
 */
export class RateLimitedAIProvider implements AIProvider {
  private rateLimiter: RateLimiter;

  constructor(
    private readonly provider: AIProvider,
    rateLimitConfig: RateLimitConfig,
    private readonly key: string,
  ) {
    this.rateLimiter = new RateLimiter(rateLimitConfig);
  }

  async generateResponse(messages: Message[]): Promise<string> {
    const result = await this.rateLimiter.check(this.key);
    if (!result.success) {
      throw new Error(
        `Rate limit exceeded. Remaining: ${result.info.remaining}, Reset: ${new Date(
          result.info.reset,
        ).toISOString()}`,
      );
    }

    return await this.provider.generateResponse(messages);
  }
}

/**
 * レートリミット付きのAIProviderを作成するファクトリー関数
 */
export function createRateLimitedAIProvider(
  provider: AIProvider,
  rateLimitConfig: RateLimitConfig,
  key: string,
): AIProvider {
  return new RateLimitedAIProvider(provider, rateLimitConfig, key);
}
