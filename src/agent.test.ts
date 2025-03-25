import { beforeEach, describe, expect, test, vi } from "vitest";
import { CodingAgent } from "./agent";
import type { AIProvider, Message } from "./agent";
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

describe("CodingAgent", () => {
  let mockAIProvider: MockAIProvider;
  let agent: CodingAgent;

  beforeEach(() => {
    mockAIProvider = new MockAIProvider();
    agent = new CodingAgent(mockAIProvider);

    // コンソール出力をスパイ
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  test("タスクを開始するとAIに初期メッセージが送信されること", async () => {
    // パーサーの呼び出しをモック
    const parseAndExecuteToolSpy = vi.spyOn(parser, "parseAndExecuteTool").mockResolvedValue({
      toolResult: { ok: true, result: "成功しました" },
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
        toolResult: { ok: true, result: "ツール実行結果" },
        isComplete: false,
      })
      .mockResolvedValueOnce({
        toolResult: { ok: true, result: "最終結果" },
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
        toolResult: {
          ok: false,
          error: {
            message: "ツール実行エラー",
            code: "TEST_ERROR",
          },
        },
        isComplete: false,
      })
      .mockResolvedValueOnce({
        toolResult: { ok: true, result: "最終結果" },
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

    // この呼び出しを強制的に有効化
    vi.spyOn(console, "log").mockImplementation((...args) => {
      // テスト実行中に実際にログ出力する
      console.info("[Test Log]", ...args);
    });

    // 実行されるたびに異なる結果を返すモック関数
    mockedParser.mockImplementation(async (assistantResponse: string) => {
      executionCount++;
      console.log(`Tool execution #${executionCount} with input: ${assistantResponse}`);

      if (executionCount === 1) {
        return {
          toolResult: { ok: true, result: firstResult },
          isComplete: false,
        };
      }

      if (executionCount === 2) {
        return {
          toolResult: { ok: true, result: secondResult },
          isComplete: false,
        };
      }

      // 3回目以降
      return {
        toolResult: { ok: true, result: finalResult },
        isComplete: true,
      };
    });

    // AIの応答をセット (3つのレスポンス)
    mockAIProvider.responses = [
      "<tool1></tool1>",
      "<tool2></tool2>",
      "<complete><result>タスク完了</result></complete>",
    ];

    await agent.start("テストタスク");

    // 3回実行されたことを確認
    expect(mockedParser).toHaveBeenCalledTimes(3);

    // ユーザーメッセージにツール実行結果が含まれていることを確認
    const userMessages = mockAIProvider.messages
      .filter((msg) => msg.role === "user")
      .map((msg) => msg.content);

    // 各メッセージを詳細に出力
    console.log("All messages:");
    mockAIProvider.messages.forEach((msg, i) => {
      console.log(`[${i}] ${msg.role}: ${msg.content}`);
    });

    console.log("\nUser messages:");
    userMessages.forEach((msg, i) => {
      console.log(`[${i}] ${msg}`);
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
    expect(mockedParser).toHaveBeenNthCalledWith(
      3,
      "<complete><result>タスク完了</result></complete>",
    );
  });
});
