import { exec } from "node:child_process";
import type { Dirent } from "node:fs";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import type { FSAdapter } from "./lib/fsAdapter";
import * as loggerModule from "./lib/logger";
import { createMockLogger } from "./lib/test-utils";
import * as tools from "./tools";

type ExecCallback = (error: Error | null, stdout: string, stderr: string) => void;
type ExecOptions = {
  encoding?: string | null;
  maxBuffer?: number;
  shell?: string;
  signal?: AbortSignal;
  timeout?: number;
  windowsHide?: boolean;
};

// exec関数のモック
vi.mock("node:child_process", () => {
  return {
    exec: vi
      .fn()
      .mockImplementation(
        (
          _cmd: string,
          options: ExecOptions | ExecCallback | null | undefined,
          callback?: ExecCallback,
        ) => {
          // 3番目の引数がコールバックの場合
          if (typeof callback === "function") {
            callback(null, "mocked stdout", "");
          }
          // 2番目の引数がコールバックの場合
          else if (typeof options === "function") {
            options(null, "mocked stdout", "");
          }
          return {} as ReturnType<typeof exec>;
        },
      ),
  };
});

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

describe("tools", () => {
  let mockLogger: ReturnType<typeof createMockLogger>;

  beforeEach(() => {
    vi.resetAllMocks();
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

  describe("listFile", () => {
    test("正常にファイル一覧を取得できる場合", async () => {
      const mockFSAdapter: FSAdapter = {
        readdir: vi
          .fn()
          .mockResolvedValue([
            { name: "file1.txt", isFile: () => true } as unknown as Dirent,
            { name: "file2.txt", isFile: () => true } as unknown as Dirent,
          ]),
        readFile: vi.fn(),
        writeFile: vi.fn(),
      };

      const result = await tools.listFile({ path: "src", recursive: false }, mockFSAdapter);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.result).toContain("Directory src contents:");
        expect(result.result).toContain("file1.txt");
        expect(result.result).toContain("file2.txt");
      }
      expect(mockFSAdapter.readdir).toHaveBeenCalledWith("src", { recursive: false });
    });

    test("エラーが発生した場合", async () => {
      const mockFSAdapter: FSAdapter = {
        readdir: vi.fn().mockRejectedValue(new Error("Access denied")),
        readFile: vi.fn(),
        writeFile: vi.fn(),
      };

      const result = await tools.listFile({ path: "/invalid", recursive: true }, mockFSAdapter);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.message).toContain("Failed to list directory");
        expect(result.error.message).toContain("Access denied");
        expect(result.error.code).toBe("LIST_FILE_ERROR");
      }
    });
  });

  describe("readFile", () => {
    test("正常にファイル内容を読み込める場合", async () => {
      const mockFSAdapter: FSAdapter = {
        readdir: vi.fn(),
        readFile: vi.fn().mockResolvedValue("file content"),
        writeFile: vi.fn(),
      };

      const result = await tools.readFile({ path: "test.txt" }, mockFSAdapter);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.result).toBe("file content");
      }
      expect(mockFSAdapter.readFile).toHaveBeenCalledWith("test.txt", "utf-8");
    });

    test("エラーが発生した場合", async () => {
      const mockFSAdapter: FSAdapter = {
        readdir: vi.fn(),
        readFile: vi.fn().mockRejectedValue(new Error("File not found")),
        writeFile: vi.fn(),
      };

      const result = await tools.readFile({ path: "nonexistent.txt" }, mockFSAdapter);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.message).toContain("Failed to read file");
        expect(result.error.message).toContain("File not found");
        expect(result.error.code).toBe("READ_FILE_ERROR");
      }
    });
  });

  describe("writeFile", () => {
    test("正常にファイルを書き込める場合", async () => {
      const mockFSAdapter: FSAdapter = {
        readdir: vi.fn(),
        readFile: vi.fn(),
        writeFile: vi.fn().mockResolvedValue(undefined),
      };

      const result = await tools.writeFile(
        {
          path: "output.txt",
          content: "Hello, world!",
        },
        mockFSAdapter,
      );

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.result).toContain("Successfully wrote to output.txt");
      }
      expect(mockFSAdapter.writeFile).toHaveBeenCalledWith(
        "output.txt",
        "Hello, world!",
        "utf-8",
      );
    });

    test("エラーが発生した場合", async () => {
      const mockFSAdapter: FSAdapter = {
        readdir: vi.fn(),
        readFile: vi.fn(),
        writeFile: vi.fn().mockRejectedValue(new Error("Permission denied")),
      };

      const result = await tools.writeFile(
        {
          path: "/protected/file.txt",
          content: "content",
        },
        mockFSAdapter,
      );

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.message).toContain("Failed to write file");
        expect(result.error.message).toContain("Permission denied");
        expect(result.error.code).toBe("WRITE_FILE_ERROR");
      }
    });
  });

  describe("askQuestion", () => {
    test("ユーザーから回答を受け取れた場合", async () => {
      // process.stdin.onceをスパイして、コールバックを直接実行
      const onceSpy = vi
        .spyOn(process.stdin, "once")
        .mockImplementation((_event: string, callback: (data: Buffer) => void) => {
          callback(Buffer.from("user answer"));
          return process.stdin;
        });

      const result = await tools.askQuestion({ question: "What is your name?" });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.result).toBe("User answered: user answer");
      }
      // ロガーにメッセージが記録されていることを確認
      expect(mockLogger.logs).toContainEqual(expect.stringContaining("What is your name?"));
      expect(onceSpy).toHaveBeenCalledWith("data", expect.any(Function));

      onceSpy.mockRestore();
    });
  });

  describe("executeCommand", () => {
    test("承認が必要でユーザーが承認した場合", async () => {
      // process.stdin.onceをスパイ
      const onceSpy = vi
        .spyOn(process.stdin, "once")
        .mockImplementation((_event: string, callback: (data: Buffer) => void) => {
          callback(Buffer.from("y"));
          return process.stdin;
        });

      // execをスタブ化して特定の戻り値を設定
      vi.mocked(exec).mockImplementation(
        (
          _cmd: string,
          options: ExecOptions | ExecCallback | null | undefined,
          callback?: ExecCallback,
        ) => {
          const execCallback =
            typeof callback === "function"
              ? callback
              : typeof options === "function"
                ? options
                : null;
          if (execCallback) {
            execCallback(null, "command output", "");
          }
          return {} as ReturnType<typeof exec>;
        },
      );

      const result = await tools.executeCommand({
        command: "ls -la",
        requiresApproval: true,
      });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.result).toContain("command output");
      }
      // ロガーにメッセージが記録されていることを確認
      expect(mockLogger.logs).toContainEqual(expect.stringContaining("Execute command?"));
      expect(onceSpy).toHaveBeenCalledWith("data", expect.any(Function));

      onceSpy.mockRestore();
    });

    test("承認が必要でユーザーが拒否した場合", async () => {
      // process.stdin.onceをスパイ
      const onceSpy = vi
        .spyOn(process.stdin, "once")
        .mockImplementation((_event: string, callback: (data: Buffer) => void) => {
          callback(Buffer.from("n"));
          return process.stdin;
        });

      const result = await tools.executeCommand({
        command: "rm -rf /",
        requiresApproval: true,
      });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.message).toContain("Command execution cancelled");
        expect(result.error.code).toBe("COMMAND_CANCELLED");
      }
      expect(onceSpy).toHaveBeenCalledWith("data", expect.any(Function));

      onceSpy.mockRestore();
    });

    test("承認が不要な場合は直接実行される", async () => {
      // execをスタブ化して特定の戻り値を設定
      vi.mocked(exec).mockImplementation(
        (
          _cmd: string,
          options: ExecOptions | ExecCallback | null | undefined,
          callback?: ExecCallback,
        ) => {
          const execCallback =
            typeof callback === "function"
              ? callback
              : typeof options === "function"
                ? options
                : null;
          if (execCallback) {
            execCallback(null, "command result", "");
          }
          return {} as ReturnType<typeof exec>;
        },
      );

      const result = await tools.executeCommand({
        command: "echo hello",
        requiresApproval: false,
      });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.result).toContain("command result");
      }
      // 承認プロンプトが表示されていないことを確認
      expect(mockLogger.logs).not.toContainEqual(expect.stringContaining("Execute command?"));
    });

    test("コマンド実行でエラーが発生した場合", async () => {
      // execをスタブ化してエラーを返すように設定
      vi.mocked(exec).mockImplementation(
        (
          _cmd: string,
          options: ExecOptions | ExecCallback | null | undefined,
          callback?: ExecCallback,
        ) => {
          const execCallback =
            typeof callback === "function"
              ? callback
              : typeof options === "function"
                ? options
                : null;
          if (execCallback) {
            execCallback(new Error("Command failed"), "", "error output");
          }
          return {} as ReturnType<typeof exec>;
        },
      );

      const result = await tools.executeCommand({
        command: "invalid-command",
        requiresApproval: false,
      });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.message).toContain("Command execution failed");
        expect(result.error.code).toBe("EXECUTE_COMMAND_ERROR");
      }
    });
  });

  describe("complete", () => {
    test("正常に完了メッセージを返すこと", async () => {
      const result = await tools.complete({ result: "All tasks done" });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.result).toBe("Task completed: All tasks done");
      }
    });
  });
});
