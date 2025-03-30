import { type FSAdapter, defaultFSAdapter } from "../../lib/fsAdapter";
import type { Logger } from "../../lib/logger";
import { type AIProvider, createAIProvider, loadAIProviderConfig } from "../ai-provider";
import { parseAndExecuteTool } from "../tools/parser";
import type { ToolResult } from "../tools/types";

const systemPrompt = `You are a coding agent. Use the following tools to complete tasks:

# ListFile
Get a list of files in a directory.
<list_file>
<path>directory path</path>
<recursive>true or false</recursive>
</list_file>

# ReadFile
Read the contents of a file.
<read_file>
<path>file path</path>
</read_file>

# WriteFile
Write content to a file.
<write_file>
<path>file path</path>
<content>
content to write
</content>
</write_file>

# AskQuestion
Ask a question to the user.
<ask_question>
<question>question content</question>
</ask_question>

# ExecuteCommand
Execute a command.
<execute_command>
<command>command to execute</command>
</execute_command>

# Complete
Indicate task completion.
<complete>
<result>task result or output description</result>
</complete>

Always use one of the above tools. Do not respond directly without using a tool.`;

export interface Message {
  content: string;
  role: "user" | "assistant";
  userId?: string;
  channelId?: string;
}

export interface Response {
  content: string;
  type: "text" | "code" | "error";
}

/**
 * コーディングエージェントを実装
 */
export class CodingAgent {
  private messages: Message[] = [];

  constructor(
    private readonly aiProvider: AIProvider,
    private readonly logger: Logger,
    private readonly fsAdapter: FSAdapter = defaultFSAdapter,
  ) {}

  /**
   * タスクを開始する
   */
  async start(task: string): Promise<void> {
    this.messages = [
      { role: "assistant", content: systemPrompt },
      { role: "user", content: task },
    ];

    let isComplete = false;
    while (!isComplete) {
      // AIからの応答を取得
      this.logger.log(`[${new Date().toISOString()}]: ${this.messages.length}`);
      const assistantResponse = await this.aiProvider.generateResponse(this.messages);
      this.messages.push({ role: "assistant", content: assistantResponse });

      // ツールを解析して実行
      const { toolResult, isComplete: complete } = await parseAndExecuteTool(
        assistantResponse,
        {
          logger: this.logger,
          fsAdapter: this.fsAdapter,
        },
      );

      // 結果をユーザーに表示
      this.displayToolResult(toolResult);

      // 結果をメッセージに追加
      const toolResultMessage = toolResult.ok ? toolResult.result : toolResult.error.message;
      this.messages.push({
        role: "user",
        content: `[Tool Result] ${toolResultMessage}`,
      });

      isComplete = complete;
    }
  }

  /**
   * ツール実行結果を表示
   */
  private displayToolResult(result: ToolResult): void {
    if (result.ok) {
      this.logger.log(`\n[${result.result}]`);
    } else {
      this.logger.error(`\n[Error: ${result.error.message}]`);
    }
  }

  /**
   * ファクトリーメソッド: Anthropic APIキーからエージェントを作成
   */
  static fromAnthropicApiKey(apiKey: string, logger: Logger): CodingAgent {
    const provider = createAIProvider("anthropic", { apiKey });
    return new CodingAgent(provider, logger);
  }

  /**
   * ファクトリーメソッド: Google AI APIキーからエージェントを作成
   */
  static fromGoogleApiKey(apiKey: string, logger: Logger): CodingAgent {
    const provider = createAIProvider("google", { apiKey });
    return new CodingAgent(provider, logger);
  }

  /**
   * ファクトリーメソッド: 環境変数から設定を読み込んでエージェントを作成
   */
  static fromEnv(type: "anthropic" | "google", logger: Logger): CodingAgent {
    const config = loadAIProviderConfig();
    const provider = createAIProvider(type, {
      apiKey: type === "anthropic" ? config.anthropicApiKey : config.geminiApiKey,
    });
    return new CodingAgent(provider, logger);
  }
}
