import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { InMemoryFSAdapter } from "../../lib/fsAdapter";
import { InMemoryLogger } from "../../lib/in-memory-logger";
import { InMemoryAIProvider } from "../ai-provider/in-memory-provider";
import { CodingAgent } from "./agent";

describe("CodingAgent", () => {
  let aiProvider: InMemoryAIProvider;
  let agent: CodingAgent;
  let logger: InMemoryLogger;
  let fsAdapter: InMemoryFSAdapter;

  beforeEach(() => {
    aiProvider = new InMemoryAIProvider();
    logger = new InMemoryLogger();
    fsAdapter = new InMemoryFSAdapter();
    agent = new CodingAgent(aiProvider, logger, fsAdapter);
  });

  afterEach(() => {
    logger.clear();
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

    // エラーログが記録されていることを確認
    const errors = logger.getErrors();
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0]).toContain("Error: Failed to read file");
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
    const logs = logger.getLogs();
    expect(logs).toContainEqual(expect.stringContaining("1回目の実行"));
    expect(logs).toContainEqual(expect.stringContaining("2回目の実行"));
    expect(logs).toContainEqual(expect.stringContaining("タスク完了"));
  });

  describe("ファクトリーメソッド", () => {
    test("fromAnthropicApiKeyでエージェントを作成できること", () => {
      const logger = new InMemoryLogger();
      const agent = CodingAgent.fromAnthropicApiKey("test-api-key", logger);
      expect(agent).toBeInstanceOf(CodingAgent);
    });

    test("fromGoogleApiKeyでエージェントを作成できること", () => {
      const logger = new InMemoryLogger();
      const agent = CodingAgent.fromGoogleApiKey("test-api-key", logger);
      expect(agent).toBeInstanceOf(CodingAgent);
    });

    test("fromEnvで環境変数から設定を読み込んでエージェントを作成できること", () => {
      const logger = new InMemoryLogger();
      const agent = CodingAgent.fromEnv("anthropic", logger);
      expect(agent).toBeInstanceOf(CodingAgent);
    });
  });
});
