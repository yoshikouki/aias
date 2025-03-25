import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { parseAndExecuteTool } from "./parser";
import type { ToolResult } from "./types";
import { generateText } from "ai";

/**
 * AIプロバイダーを抽象化するアダプター
 */
export interface AIProvider {
  generateResponse(messages: Message[]): Promise<string>;
}

/**
 * メッセージの型定義
 */
export type Role = "user" | "assistant";
export interface Message {
  role: Role;
  content: string;
}

/**
 * Anthropicを利用したAIプロバイダーの実装
 */
export class AnthropicProvider implements AIProvider {
  private anthropic: ReturnType<typeof createAnthropic>;
  private model: string;

  constructor(apiKey: string, model = "claude-3-7-sonnet-20250219") {
    this.anthropic = createAnthropic({ apiKey });
    this.model = model;
  }

  async generateResponse(messages: Message[]): Promise<string> {
    const response = await generateText({
      model: this.anthropic(this.model),
      messages,
      temperature: 0.7,
    });

    return response.text;
  }
}

/**
 * Google AI (Gemini) を利用したAIプロバイダーの実装
 */
export class GoogleAIProvider implements AIProvider {
  private google: ReturnType<typeof createGoogleGenerativeAI>;
  private model: string;

  constructor(apiKey: string, model = "gemini-2.0-flash") {
    this.google = createGoogleGenerativeAI({ apiKey });
    this.model = model;
  }

  async generateResponse(messages: Message[]): Promise<string> {
    const response = await generateText({
      model: this.google(this.model),
      messages,
      temperature: 0.7,
    });

    return response.text;
  }
}

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
<requires_approval>true or false</requires_approval>
</execute_command>

# Complete
Indicate task completion.
<complete>
<result>task result or output description</result>
</complete>

Always use one of the above tools. Do not respond directly without using a tool.`;

/**
 * コーディングエージェントを実装
 */
export class CodingAgent {
  private aiProvider: AIProvider;
  private messages: Message[] = [];

  constructor(aiProvider: AIProvider) {
    this.aiProvider = aiProvider;
  }

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
      const assistantResponse = await this.aiProvider.generateResponse(this.messages);
      this.messages.push({ role: "assistant", content: assistantResponse });

      // ツールを解析して実行
      const { toolResult, isComplete: complete } = await parseAndExecuteTool(assistantResponse);

      // 結果をユーザーに表示
      this.displayToolResult(toolResult);

      // 結果をメッセージに追加
      this.messages.push({
        role: "user",
        content: `[Tool Result] ${toolResult.ok ? toolResult.result : toolResult.error.message}`,
      });

      isComplete = complete;
    }
  }

  /**
   * ツール実行結果を表示
   */
  private displayToolResult(result: ToolResult): void {
    if (result.ok) {
      console.log(`\n[${result.result}]`);
    } else {
      console.error(`\n[Error: ${result.error.message}]`);
    }
  }

  /**
   * ファクトリーメソッド: Anthropic APIキーからエージェントを作成
   */
  static fromAnthropicApiKey(apiKey: string): CodingAgent {
    const provider = new AnthropicProvider(apiKey);
    return new CodingAgent(provider);
  }

  /**
   * ファクトリーメソッド: Google AI APIキーからエージェントを作成
   */
  static fromGoogleApiKey(apiKey: string): CodingAgent {
    const provider = new GoogleAIProvider(apiKey);
    return new CodingAgent(provider);
  }
}
