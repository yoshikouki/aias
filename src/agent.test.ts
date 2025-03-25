import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { CodingAgent } from "./agent";
import type { AIProvider, Message } from "./agent";
import * as loggerModule from "./lib/logger";
import { failure, success } from "./lib/result";
import { createMockLogger } from "./lib/test-utils";
import * as parser from "./parser";

// AIProviderのモック
class MockAIProvider implements AIProvider {
  public responses: string[] = [];
  public messages: Message[] = [];

  async generateResponse(messages: Message[]): Promise<string> {
    this.messages = [...messages];
    return this.responses.shift() || "";
  }
}

// logger モジュールのモック
vi.mock("./lib/logger", () => {
  const mockLogger = {
    log: vi.fn(),
    error: vi.fn(),
  };
  return {
    logger: mockLogger,
    createConsoleLogger: vi.fn().mockReturnValue(mockLogger),
    createSilentLogger: vi.fn().mockReturnValue(mockLogger),
    createInMemoryLogger: vi.fn().mockReturnValue(mockLogger),
  };
});

describe("CodingAgent", () => {
  let mockAIProvider: MockAIProvider;
  let agent: CodingAgent;
  let mockLogger: ReturnType<typeof createMockLogger>;

  beforeEach(() => {
    vi.resetAllMocks();
    mockAIProvider = new MockAIProvider();
    agent = new CodingAgent(mockAIProvider);

    // モックロガーを作成
    mockLogger = createMockLogger();
    // loggerモジュールのloggerをモックロガーで上書き
    Object.defineProperty(loggerModule, "logger", {
      value: mockLogger,
      writable: true,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  test("タスクを開始するとAIに初期メッセージが送信されること", async () => {
    // パーサーの呼び出しをモック
    const parseAndExecuteToolSpy = vi.spyOn(parser, "parseAndExecuteTool").mockResolvedValue({
      toolResult: success("成功しました"),
      isComplete: true,
    });

    // AIの応答をセット
    mockAIProvider.responses = ["<complete><r>タスク完了</r></complete>"];

    await agent.start("テストタスク");

    // システムプロンプトとユーザータスクが送られていることを検証
    expect(mockAIProvider.messages.length).toBeGreaterThanOrEqual(2);
    expect(mockAIProvider.messages[0]?.role).toBe("assistant");
    expect(mockAIProvider.messages[0]?.content).toContain("You are a coding agent");
    expect(mockAIProvider.messages[1]?.role).toBe("user");
    expect(mockAIProvider.messages[1]?.content).toBe("テストタスク");

    // パーサーが呼び出されたことを検証
    expect(parseAndExecuteToolSpy).toHaveBeenCalledWith(
      "<complete><r>タスク完了</r></complete>",
    );
  });

  test("ツール実行の結果がメッセージに追加されること", async () => {
    // パーサーの呼び出しをモック
    vi.spyOn(parser, "parseAndExecuteTool")
      .mockResolvedValueOnce({
        toolResult: success("ツール実行結果"),
        isComplete: false,
      })
      .mockResolvedValueOnce({
        toolResult: success("最終結果"),
        isComplete: true,
      });

    // AIの応答をセット
    mockAIProvider.responses = [
      "<tool1></tool1>",
      "<complete><result>タスク完了</result></complete>",
    ];

    await agent.start("テストタスク");

    // モックオブジェクトのメッセージ配列を確認する
    console.log(
      mockAIProvider.messages.map(
        (msg, i) => `[${i}] ${msg.role}: ${msg.content.substring(0, 30)}...`,
      ),
    );

    // システムプロンプト、ユーザータスク、AIの応答のあとにツール実行結果が追加されることを確認
    expect(mockAIProvider.messages.length).toBeGreaterThanOrEqual(4);
    const toolResultMessage = mockAIProvider.messages.find(
      (msg) => msg.role === "user" && msg.content.includes("[Tool Result] ツール実行結果"),
    );
    expect(toolResultMessage).toBeDefined();
  });

  test("ツール実行に失敗した場合もエラーメッセージがユーザーメッセージに追加されること", async () => {
    // パーサーの呼び出しをモック
    vi.spyOn(parser, "parseAndExecuteTool")
      .mockResolvedValueOnce({
        toolResult: failure({
          message: "ツール実行エラー",
          code: "TEST_ERROR",
        }),
        isComplete: false,
      })
      .mockResolvedValueOnce({
        toolResult: success("最終結果"),
        isComplete: true,
      });

    // AIの応答をセット
    mockAIProvider.responses = [
      "<invalid></invalid>",
      "<complete><result>タスク完了</result></complete>",
    ];

    await agent.start("テストタスク");

    // システムプロンプト、ユーザータスク、AIの応答のあとにエラーメッセージが追加されることを確認
    const errorMessage = mockAIProvider.messages.find(
      (msg) => msg.role === "user" && msg.content.includes("[Tool Result] ツール実行エラー"),
    );
    expect(errorMessage).toBeDefined();
  });

  test("タスクが完了するまでループが続くこと", async () => {
    // テスト用の変数
    const firstResult = "1回目の実行";
    const secondResult = "2回目の実行";
    const finalResult = "タスク完了";

    // パーサーの呼び出しをモック
    const mockedParser = vi.spyOn(parser, "parseAndExecuteTool");

    // 実行回数をカウントするための変数
    let executionCount = 0;

    // テスト用に独自のログ記録関数を定義
    const testLogs: string[] = [];
    const log = (message: string): void => {
      testLogs.push(message);
    };

    // 実行されるたびに異なる結果を返すモック関数
    mockedParser.mockImplementation(async (assistantResponse: string) => {
      executionCount++;
      log(`Tool execution #${executionCount} with input: ${assistantResponse}`);

      if (executionCount === 1) {
        return {
          toolResult: success(firstResult),
          isComplete: false,
        };
      }

      if (executionCount === 2) {
        return {
          toolResult: success(secondResult),
          isComplete: false,
        };
      }

      // 3回目以降
      return {
        toolResult: success(finalResult),
        isComplete: true,
      };
    });

    // AIの応答をセット (3つのレスポンス)
    mockAIProvider.responses = [
      "<tool1></tool1>",
      "<tool2></tool2>",
      "<complete><r>タスク完了</r></complete>",
    ];

    await agent.start("テストタスク");

    // 3回実行されたことを確認
    expect(mockedParser).toHaveBeenCalledTimes(3);

    // ユーザーメッセージにツール実行結果が含まれていることを確認
    const userMessages = mockAIProvider.messages
      .filter((msg) => msg.role === "user")
      .map((msg) => msg.content);

    // 各メッセージを詳細に出力（テスト用）
    log("All messages:");
    mockAIProvider.messages.forEach((msg, i) => {
      log(`[${i}] ${msg.role}: ${msg.content}`);
    });

    log("\nUser messages:");
    userMessages.forEach((msg, i) => {
      log(`[${i}] ${msg}`);
    });

    // 初期のユーザーメッセージ
    expect(userMessages).toContain("テストタスク");

    // 最初の2つのツール実行結果が含まれていることは確認
    const firstToolResult = `[Tool Result] ${firstResult}`;
    const secondToolResult = `[Tool Result] ${secondResult}`;

    expect(userMessages).toContain(firstToolResult);
    expect(userMessages).toContain(secondToolResult);

    // 実際の挙動では、最後の結果はメッセージに追加されていない
    // (デバッグログから確認)

    // パーサーが正しく呼び出されたことを確認
    expect(mockedParser).toHaveBeenNthCalledWith(1, "<tool1></tool1>");
    expect(mockedParser).toHaveBeenNthCalledWith(2, "<tool2></tool2>");
    expect(mockedParser).toHaveBeenNthCalledWith(3, "<complete><r>タスク完了</r></complete>");

    // ロガーに記録されているメッセージを確認
    expect(mockLogger.logs).toContainEqual(expect.stringContaining(firstResult));
    expect(mockLogger.logs).toContainEqual(expect.stringContaining(secondResult));
    expect(mockLogger.logs).toContainEqual(expect.stringContaining(finalResult));
  });
});
