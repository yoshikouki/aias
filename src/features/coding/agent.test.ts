import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { InMemoryFSAdapter } from "../../lib/in-memory-fs-adapter";
import { createMockLogger } from "../../lib/test-utils";
import { InMemoryAIProvider } from "../ai-provider/in-memory-provider";
import * as tools from "../tools/tools";
import type { ListFileParams, ReadFileParams, WriteFileParams } from "../tools/types";
import { CodingAgent } from "./agent";

describe("CodingAgent", () => {
  let aiProvider: InMemoryAIProvider;
  let agent: CodingAgent;
  let mockLogger: ReturnType<typeof createMockLogger>;
  let fsAdapter: InMemoryFSAdapter;

  beforeEach(() => {
    vi.resetAllMocks();
    aiProvider = new InMemoryAIProvider();
    mockLogger = createMockLogger();
    fsAdapter = new InMemoryFSAdapter();
    agent = new CodingAgent(aiProvider, mockLogger);

    // ツールの依存関係を設定
    vi.spyOn(tools, "listFile").mockImplementation(async (params: ListFileParams) => {
      const files = await fsAdapter.readdir(params.path, { recursive: params.recursive });
      const filesStr = files
        .map((file) => {
          if (typeof file === "string") {
            return file;
          }
          // @ts-ignore - Direntオブジェクトの場合nameプロパティが存在する
          if (file && typeof file === "object" && "name" in file) {
            // @ts-ignore
            return file.name;
          }
          return String(file);
        })
        .join("\n");
      return { ok: true, result: `Directory ${params.path} contents:\n${filesStr}` };
    });

    vi.spyOn(tools, "readFile").mockImplementation(async (params: ReadFileParams) => {
      try {
        const content = await fsAdapter.readFile(params.path, "utf-8");
        return { ok: true, result: content };
      } catch (error) {
        return {
          ok: false,
          error: {
            code: "READ_FILE_ERROR",
            message: "Failed to read file",
            error,
          },
        };
      }
    });

    vi.spyOn(tools, "writeFile").mockImplementation(async (params: WriteFileParams) => {
      try {
        await fsAdapter.writeFile(params.path, params.content, "utf-8");
        return { ok: true, result: `Successfully wrote to ${params.path}` };
      } catch (error) {
        return {
          ok: false,
          error: {
            code: "WRITE_FILE_ERROR",
            message: "Failed to write file",
            error,
          },
        };
      }
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    fsAdapter.clear();
  });

  test("タスクを開始するとAIに初期メッセージが送信されること", async () => {
    // AIの応答をセット
    aiProvider.setResponses(["<complete><r>タスク完了</r></complete>"]);

    await agent.start("テストタスク");

    // システムプロンプトとユーザータスクが送られていることを検証
    const messages = aiProvider.getMessages();
    expect(messages.length).toBeGreaterThanOrEqual(2);
    expect(messages[0]?.role).toBe("assistant");
    expect(messages[0]?.content).toContain("You are a coding agent");
    expect(messages[1]?.role).toBe("user");
    expect(messages[1]?.content).toBe("テストタスク");
  });

  test("ツール実行の結果がメッセージに追加されること", async () => {
    // テストファイルを作成
    await fsAdapter.writeFile("test.txt", "テストファイルの内容", "utf-8");

    // AIの応答をセット
    aiProvider.setResponses([
      "<read_file><path>test.txt</path></read_file>",
      "<complete><r>タスク完了</r></complete>",
    ]);

    await agent.start("テストタスク");

    // メッセージ配列を確認する
    const messages = aiProvider.getMessages();

    // システムプロンプト、ユーザータスク、AIの応答のあとにツール実行結果が追加されることを確認
    expect(messages.length).toBeGreaterThanOrEqual(4);
    const toolResultMessage = messages.find(
      (msg) =>
        msg.role === "user" && msg.content.includes("[Tool Result] テストファイルの内容"),
    );
    expect(toolResultMessage).toBeDefined();
  });

  test("ツール実行に失敗した場合もエラーメッセージがユーザーメッセージに追加されること", async () => {
    // AIの応答をセット
    aiProvider.setResponses([
      "<read_file><path>not_exists.txt</path></read_file>",
      "<complete><r>タスク完了</r></complete>",
    ]);

    await agent.start("テストタスク");

    // システムプロンプト、ユーザータスク、AIの応答のあとにエラーメッセージが追加されることを確認
    const messages = aiProvider.getMessages();
    const errorMessage = messages.find(
      (msg) => msg.role === "user" && msg.content.includes("[Tool Result] Failed to read file"),
    );
    expect(errorMessage).toBeDefined();
  });

  test("タスクが完了するまでループが続くこと", async () => {
    // テストファイルを作成
    await fsAdapter.writeFile("test1.txt", "1回目の実行", "utf-8");
    await fsAdapter.writeFile("test2.txt", "2回目の実行", "utf-8");

    // AIの応答をセット (3つのレスポンス)
    aiProvider.setResponses([
      "<read_file><path>test1.txt</path></read_file>",
      "<read_file><path>test2.txt</path></read_file>",
      "<complete><r>タスク完了</r></complete>",
    ]);

    await agent.start("テストタスク");

    // ユーザーメッセージにツール実行結果が含まれていることを確認
    const messages = aiProvider.getMessages();
    const userMessages = messages
      .filter((msg) => msg.role === "user")
      .map((msg) => msg.content);

    // 初期のユーザーメッセージ
    expect(userMessages).toContain("テストタスク");

    // 最初の2つのツール実行結果が含まれていることは確認
    const firstToolResult = "[Tool Result] 1回目の実行";
    const secondToolResult = "[Tool Result] 2回目の実行";

    expect(userMessages).toContain(firstToolResult);
    expect(userMessages).toContain(secondToolResult);

    // ロガーに記録されているメッセージを確認
    expect(mockLogger.logs).toContainEqual(expect.stringContaining("1回目の実行"));
    expect(mockLogger.logs).toContainEqual(expect.stringContaining("2回目の実行"));
    expect(mockLogger.logs).toContainEqual(expect.stringContaining("タスク完了"));
  });

  describe("ファクトリーメソッド", () => {
    test("fromAnthropicApiKeyでレートリミット付きのエージェントを作成できること", () => {
      const rateLimitConfig = {
        maxRequests: 10,
        windowMs: 60000,
      };
      const rateLimitKey = "test-user";
      const mockLogger = createMockLogger();

      const agent = CodingAgent.fromAnthropicApiKey(
        "test-api-key",
        mockLogger,
        rateLimitConfig,
        rateLimitKey,
      );

      expect(agent).toBeInstanceOf(CodingAgent);
    });

    test("fromGoogleApiKeyでレートリミット付きのエージェントを作成できること", () => {
      const rateLimitConfig = {
        maxRequests: 10,
        windowMs: 60000,
      };
      const rateLimitKey = "test-user";
      const mockLogger = createMockLogger();

      const agent = CodingAgent.fromGoogleApiKey(
        "test-api-key",
        mockLogger,
        rateLimitConfig,
        rateLimitKey,
      );

      expect(agent).toBeInstanceOf(CodingAgent);
    });

    test("レートリミット設定なしでエージェントを作成できること", () => {
      const mockLogger = createMockLogger();
      const agent = CodingAgent.fromAnthropicApiKey("test-api-key", mockLogger);
      expect(agent).toBeInstanceOf(CodingAgent);
    });

    describe("fromEnv", () => {
      test("環境変数から設定を読み込んでエージェントを作成できること", () => {
        process.env.AI_API_KEY = "test-api-key";
        process.env.AI_MODEL = "test-model";
        process.env.AI_TEMPERATURE = "0.7";
        const mockLogger = createMockLogger();

        const agent = CodingAgent.fromEnv("anthropic", mockLogger);
        expect(agent).toBeInstanceOf(CodingAgent);
      });

      test("レートリミットの設定も読み込めること", () => {
        process.env.AI_API_KEY = "test-api-key";
        process.env.AI_RATE_LIMIT_MAX_REQUESTS = "10";
        process.env.AI_RATE_LIMIT_WINDOW_MS = "60000";
        process.env.AI_RATE_LIMIT_KEY = "test-user";
        const mockLogger = createMockLogger();

        const agent = CodingAgent.fromEnv("anthropic", mockLogger);
        expect(agent).toBeInstanceOf(CodingAgent);
      });

      test("必須の環境変数が設定されていない場合はエラーを投げること", () => {
        const originalEnv = { ...process.env };
        process.env = {};
        const mockLogger = createMockLogger();

        expect(() => CodingAgent.fromEnv("anthropic", mockLogger)).toThrow(
          "ANTHROPIC_API_KEY or GEMINI_API_KEY is required",
        );
        process.env = originalEnv;
      });
    });
  });
});
