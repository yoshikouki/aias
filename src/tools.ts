import { exec } from "node:child_process";
import { promises as fs } from "node:fs";
import { promisify } from "node:util";
import type {
  AskQuestionParams,
  CompleteParams,
  ExecuteCommandParams,
  ListFileParams,
  ReadFileParams,
  Result,
  ToolError,
  ToolResult,
  WriteFileParams,
} from "./types";

const execAsync = promisify(exec);

/**
 * ディレクトリ内のファイル一覧を取得する
 */
export async function listFile(params: ListFileParams): Promise<ToolResult> {
  try {
    const files = await fs.readdir(params.path, { recursive: params.recursive });
    const result = `Directory ${params.path} contents:\n${files.join("\n")}`;
    return { ok: true, result };
  } catch (error) {
    return {
      ok: false,
      error: {
        message: `Failed to list directory: ${error instanceof Error ? error.message : String(error)}`,
        code: "LIST_FILE_ERROR",
      },
    };
  }
}

/**
 * ファイル内容を読み込む
 */
export async function readFile(params: ReadFileParams): Promise<ToolResult> {
  try {
    const content = await fs.readFile(params.path, "utf-8");
    return { ok: true, result: content };
  } catch (error) {
    return {
      ok: false,
      error: {
        message: `Failed to read file: ${error instanceof Error ? error.message : String(error)}`,
        code: "READ_FILE_ERROR",
      },
    };
  }
}

/**
 * ファイルに内容を書き込む
 */
export async function writeFile(params: WriteFileParams): Promise<ToolResult> {
  try {
    await fs.writeFile(params.path, params.content, "utf-8");
    return { ok: true, result: `Successfully wrote to ${params.path}` };
  } catch (error) {
    return {
      ok: false,
      error: {
        message: `Failed to write file: ${error instanceof Error ? error.message : String(error)}`,
        code: "WRITE_FILE_ERROR",
      },
    };
  }
}

/**
 * ユーザーに質問を投げかけ、回答を取得する
 */
export async function askQuestion(params: AskQuestionParams): Promise<ToolResult> {
  try {
    console.log(`\nQuestion: ${params.question}`);
    const answer = await new Promise<string>((resolve) => {
      process.stdin.once("data", (data) => resolve(data.toString().trim()));
    });
    return { ok: true, result: `User answered: ${answer}` };
  } catch (error) {
    return {
      ok: false,
      error: {
        message: `Failed to get user answer: ${error instanceof Error ? error.message : String(error)}`,
        code: "ASK_QUESTION_ERROR",
      },
    };
  }
}

/**
 * コマンドを実行する
 */
export async function executeCommand(params: ExecuteCommandParams): Promise<ToolResult> {
  try {
    if (params.requiresApproval) {
      console.log(`\nExecute command?\n${params.command}\n[y/n]: `);
      const answer = await new Promise<string>((resolve) => {
        process.stdin.once("data", (data) => resolve(data.toString().trim()));
      });

      if (answer.toLowerCase() !== "y") {
        return {
          ok: false,
          error: {
            message: "Command execution cancelled by user",
            code: "COMMAND_CANCELLED",
          },
        };
      }
    }

    const { stdout, stderr } = await execAsync(params.command);
    return { ok: true, result: `Command output:\n${stdout}\n${stderr}` };
  } catch (error) {
    return {
      ok: false,
      error: {
        message: `Command execution failed: ${error instanceof Error ? error.message : String(error)}`,
        code: "EXECUTE_COMMAND_ERROR",
      },
    };
  }
}

/**
 * タスク完了を示す
 */
export async function complete(params: CompleteParams): Promise<ToolResult> {
  return { ok: true, result: `Task completed: ${params.result}` };
}
