import type { Dirent } from "node:fs";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { MockCommandAdapter } from "./lib/commandAdapter";
import type { FSAdapter } from "./lib/fsAdapter";
import { createMockLogger } from "./lib/test-utils";
import * as tools from "./tools";

// logger モジュールのモック
vi.mock("./lib/logger", () => ({
  createMockLogger: vi.fn(),
  logger: {
    log: vi.fn(),
    error: vi.fn(),
  },
}));

describe("tools", () => {
  let mockLogger: ReturnType<typeof createMockLogger>;

  beforeEach(() => {
    mockLogger = createMockLogger();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
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

      const result = await tools.listFile(
        { path: "src", recursive: false },
        { fsAdapter: mockFSAdapter },
      );

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
        readdir: vi
          .fn()
          .mockRejectedValue(
            new Error("ENOENT: no such file or directory, scandir '/invalid'"),
          ),
        readFile: vi.fn(),
        writeFile: vi.fn(),
      };

      const result = await tools.listFile(
        { path: "/invalid", recursive: true },
        { fsAdapter: mockFSAdapter },
      );

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.message).toContain("Failed to list directory");
        expect(result.error.message).toContain("ENOENT: no such file or directory");
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

      const result = await tools.readFile({ path: "test.txt" }, { fsAdapter: mockFSAdapter });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.result).toBe("file content");
      }
      expect(mockFSAdapter.readFile).toHaveBeenCalledWith("test.txt", "utf-8");
    });

    test("エラーが発生した場合", async () => {
      const mockFSAdapter: FSAdapter = {
        readdir: vi.fn(),
        readFile: vi
          .fn()
          .mockRejectedValue(
            new Error("ENOENT: no such file or directory, open 'nonexistent.txt'"),
          ),
        writeFile: vi.fn(),
      };

      const result = await tools.readFile(
        { path: "nonexistent.txt" },
        { fsAdapter: mockFSAdapter },
      );

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.message).toContain("Failed to read file");
        expect(result.error.message).toContain("ENOENT: no such file or directory");
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
        { fsAdapter: mockFSAdapter },
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
        writeFile: vi
          .fn()
          .mockRejectedValue(
            new Error("ENOENT: no such file or directory, open '/protected/file.txt'"),
          ),
      };

      const result = await tools.writeFile(
        {
          path: "/protected/file.txt",
          content: "content",
        },
        { fsAdapter: mockFSAdapter },
      );

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.message).toContain("Failed to write file");
        expect(result.error.message).toContain("ENOENT: no such file or directory");
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

      const result = await tools.askQuestion(
        { question: "What is your name?" },
        { logger: mockLogger },
      );

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
    test("コマンドが正常に実行されること", async () => {
      const mockAdapter = new MockCommandAdapter({
        stdout: "command output",
        stderr: "stderr output",
      });

      const result = await tools.executeCommand(
        {
          command: "ls -la",
        },
        { commandAdapter: mockAdapter, logger: mockLogger },
      );

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.result).toContain("command output");
      }
      // ロガーにメッセージが記録されていることを確認
      expect(mockLogger.logs).toContainEqual(expect.stringContaining("Execute command:"));
    });

    test("コマンド実行でエラーが発生した場合", async () => {
      const mockAdapter = new MockCommandAdapter();
      vi.spyOn(mockAdapter, "execute").mockRejectedValue(new Error("Command failed"));

      const result = await tools.executeCommand(
        {
          command: "invalid-command",
        },
        { commandAdapter: mockAdapter, logger: mockLogger },
      );

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
