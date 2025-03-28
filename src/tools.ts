import { createInterface } from "node:readline";
import { type CommandAdapter, NodeCommandAdapter } from "./lib/commandAdapter";
import { type FSAdapter, defaultFSAdapter } from "./lib/fsAdapter";
import { type Logger, logger as defaultLogger } from "./lib/logger";
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

interface Dependencies {
  logger?: Logger;
  fsAdapter?: FSAdapter;
  commandAdapter?: CommandAdapter;
}

const defaultDeps = {
  logger: defaultLogger,
  fsAdapter: defaultFSAdapter,
  commandAdapter: new NodeCommandAdapter(),
} as const;

/**
 * ディレクトリ内のファイル一覧を取得する
 */
export async function listFile(
  params: ListFileParams,
  deps: Partial<Dependencies> = {},
): Promise<ToolResult> {
  const { logger, fsAdapter } = { ...defaultDeps, ...deps };
  try {
    logger.log(`\nListing directory: ${params.path}`);
    const files = await fsAdapter.readdir(params.path, { recursive: params.recursive });
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
export async function readFile(
  params: ReadFileParams,
  deps: Partial<Dependencies> = {},
): Promise<ToolResult> {
  const { logger, fsAdapter } = { ...defaultDeps, ...deps };
  try {
    logger.log(`\nReading file: ${params.path}`);
    const content = await fsAdapter.readFile(params.path, "utf-8");
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
export async function writeFile(
  params: WriteFileParams,
  deps: Partial<Dependencies> = {},
): Promise<ToolResult> {
  const { logger, fsAdapter } = { ...defaultDeps, ...deps };
  try {
    logger.log(`\nWriting to file: ${params.path}`);
    await fsAdapter.writeFile(params.path, params.content, "utf-8");
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
export async function askQuestion(
  params: AskQuestionParams,
  deps: Partial<Dependencies> = {},
): Promise<ToolResult> {
  const { logger } = { ...defaultDeps, ...deps };
  try {
    logger.log(`\nQuestion: ${params.question}`);
    const rl = createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    const answer = await new Promise<string>((resolve) => {
      rl.question("> ", (answer) => {
        rl.close();
        resolve(answer.trim());
      });
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
export async function executeCommand(
  params: ExecuteCommandParams,
  deps: Partial<Dependencies> = {},
): Promise<ToolResult> {
  const { logger, commandAdapter } = { ...defaultDeps, ...deps };
  try {
    logger.log(`\nExecute command:\n${params.command}`);
    const { stdout, stderr } = await commandAdapter.execute(params.command);
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
