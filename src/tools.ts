import { exec } from "node:child_process";
import { promises as fs } from "node:fs";
import { promisify } from "node:util";
import { logger } from "./lib/logger";
import { failure, success } from "./lib/result";
import type {
  AskQuestionParams,
  CompleteParams,
  ExecuteCommandParams,
  ListFileParams,
  ReadFileParams,
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
    // ファイル配列をフォーマットして一覧表示
    const filesStr = files
      .map((file) => {
        // fs.readdirはstring[]またはDirent[]を返す可能性がある
        if (typeof file === "string") {
          return file;
        }
        // Direntオブジェクトの場合
        // @ts-ignore - Direntオブジェクトの場合nameプロパティが存在する
        if (file && typeof file === "object" && "name" in file) {
          // @ts-ignore
          return file.name;
        }
        return String(file);
      })
      .join("\n");
    const result = `Directory ${params.path} contents:\n${filesStr}`;
    return success(result);
  } catch (error) {
    return failure({
      code: "LIST_FILE_ERROR",
      message: "Failed to list directory",
      error,
    });
  }
}

/**
 * ファイル内容を読み込む
 */
export async function readFile(params: ReadFileParams): Promise<ToolResult> {
  try {
    const content = await fs.readFile(params.path, "utf-8");
    return success(content);
  } catch (error) {
    return failure({
      code: "READ_FILE_ERROR",
      message: "Failed to read file",
      error,
    });
  }
}

/**
 * ファイルに内容を書き込む
 */
export async function writeFile(params: WriteFileParams): Promise<ToolResult> {
  try {
    await fs.writeFile(params.path, params.content, "utf-8");
    return success(`Successfully wrote to ${params.path}`);
  } catch (error) {
    return failure({
      code: "WRITE_FILE_ERROR",
      message: "Failed to write file",
      error,
    });
  }
}

/**
 * ユーザーに質問を投げかけ、回答を取得する
 */
export async function askQuestion(params: AskQuestionParams): Promise<ToolResult> {
  try {
    logger.log(`\nQuestion: ${params.question}`);
    const answer = await new Promise<string>((resolve) => {
      process.stdin.once("data", (data) => resolve(data.toString().trim()));
    });
    return success(`User answered: ${answer}`);
  } catch (error) {
    return failure({
      code: "ASK_QUESTION_ERROR",
      message: "Failed to get user answer",
      error,
    });
  }
}

/**
 * コマンドを実行する
 */
export async function executeCommand(params: ExecuteCommandParams): Promise<ToolResult> {
  try {
    logger.log(`\nExecute command:\n${params.command}`);
    const { stdout, stderr } = await execAsync(params.command);
    return success(`Command output:\n${stdout}\n${stderr}`);
  } catch (error) {
    return failure({
      code: "EXECUTE_COMMAND_ERROR",
      message: "Command execution failed",
      error,
    });
  }
}

/**
 * タスク完了を示す
 */
export async function complete(params: CompleteParams): Promise<ToolResult> {
  return success(`Task completed: ${params.result}`);
}
