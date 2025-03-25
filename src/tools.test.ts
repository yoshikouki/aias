import { exec } from "node:child_process";
import { promises as fs } from "node:fs";
import type { Dirent } from "node:fs";
import { beforeEach, describe, expect, test, vi } from "vitest";
import * as tools from "./tools";

// モック用の型定義
type MockStdin = {
  once: (event: string, callback: (data: Buffer) => void) => MockStdin;
};

type ExecCallback = (error: Error | null, result: { stdout: string; stderr: string }) => void;

// fs.readdir, fs.readFile, fs.writeFileのモック
vi.mock("node:fs", () => ({
  promises: {
    readdir: vi.fn(),
    readFile: vi.fn(),
    writeFile: vi.fn(),
  },
}));

// exec関数のモック
vi.mock("node:child_process", () => ({
  exec: vi.fn(),
}));

describe("tools", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    // コンソール出力をスパイ
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  describe("listFile", () => {
    test("正常にファイル一覧を取得できる場合", async () => {
      // モックの戻り値を設定
      vi.mocked(fs.readdir).mockResolvedValue([
        { name: "file1.txt", isFile: () => true } as unknown as Dirent,
        { name: "file2.txt", isFile: () => true } as unknown as Dirent,
      ]);

      const result = await tools.listFile({ path: "src", recursive: false });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.result).toContain("Directory src contents:");
        expect(result.result).toContain("file1.txt");
        expect(result.result).toContain("file2.txt");
      }
      expect(fs.readdir).toHaveBeenCalledWith("src", { recursive: false });
    });

    test("エラーが発生した場合", async () => {
      // モックにエラーを設定
      vi.mocked(fs.readdir).mockRejectedValue(new Error("Access denied"));

      const result = await tools.listFile({ path: "/invalid", recursive: true });

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
      // モックの戻り値を設定
      vi.mocked(fs.readFile).mockResolvedValue("file content" as any);

      const result = await tools.readFile({ path: "test.txt" });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.result).toBe("file content");
      }
      expect(fs.readFile).toHaveBeenCalledWith("test.txt", "utf-8");
    });

    test("エラーが発生した場合", async () => {
      // モックにエラーを設定
      vi.mocked(fs.readFile).mockRejectedValue(new Error("File not found"));

      const result = await tools.readFile({ path: "nonexistent.txt" });

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
      // モックの戻り値を設定
      vi.mocked(fs.writeFile).mockResolvedValue(undefined);

      const result = await tools.writeFile({
        path: "output.txt",
        content: "Hello, world!",
      });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.result).toContain("Successfully wrote to output.txt");
      }
      expect(fs.writeFile).toHaveBeenCalledWith("output.txt", "Hello, world!", "utf-8");
    });

    test("エラーが発生した場合", async () => {
      // モックにエラーを設定
      vi.mocked(fs.writeFile).mockRejectedValue(new Error("Permission denied"));

      const result = await tools.writeFile({
        path: "/protected/file.txt",
        content: "content",
      });

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
        .mockImplementation((event, callback: any) => {
          callback(Buffer.from("user answer"));
          return process.stdin;
        });

      const result = await tools.askQuestion({ question: "What is your name?" });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.result).toBe("User answered: user answer");
      }
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining("What is your name?"));
      expect(onceSpy).toHaveBeenCalledWith("data", expect.any(Function));

      onceSpy.mockRestore();
    });
  });

  describe("executeCommand", () => {
    test("承認が必要でユーザーが承認した場合", async () => {
      // process.stdin.onceをスパイ
      const onceSpy = vi
        .spyOn(process.stdin, "once")
        .mockImplementation((event, callback: any) => {
          callback(Buffer.from("y"));
          return process.stdin;
        });

      // execをスタブ化
      vi.mocked(exec).mockImplementation((cmd: string, options: any, callback?: any) => {
        if (callback) {
          callback(null, { stdout: "command output", stderr: "" });
        } else if (typeof options === "function") {
          options(null, { stdout: "command output", stderr: "" });
        }
        return {} as any;
      });

      const result = await tools.executeCommand({
        command: "ls -la",
        requiresApproval: true,
      });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.result).toContain("command output");
      }
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining("Execute command?"));
      expect(onceSpy).toHaveBeenCalledWith("data", expect.any(Function));

      onceSpy.mockRestore();
    });

    test("承認が必要でユーザーが拒否した場合", async () => {
      // process.stdin.onceをスパイ
      const onceSpy = vi
        .spyOn(process.stdin, "once")
        .mockImplementation((event, callback: any) => {
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
      // execをスタブ化
      vi.mocked(exec).mockImplementation((cmd: string, options: any, callback?: any) => {
        if (callback) {
          callback(null, { stdout: "command result", stderr: "" });
        } else if (typeof options === "function") {
          options(null, { stdout: "command result", stderr: "" });
        }
        return {} as any;
      });

      const result = await tools.executeCommand({
        command: "echo hello",
        requiresApproval: false,
      });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.result).toContain("command result");
      }
      // 承認プロンプトが表示されていないことを確認
      expect(console.log).not.toHaveBeenCalledWith(expect.stringContaining("Execute command?"));
    });

    test("コマンド実行でエラーが発生した場合", async () => {
      // execをスタブ化
      vi.mocked(exec).mockImplementation((cmd: string, options: any, callback?: any) => {
        if (callback) {
          callback(new Error("Command failed"), { stdout: "", stderr: "error output" });
        } else if (typeof options === "function") {
          options(new Error("Command failed"), { stdout: "", stderr: "error output" });
        }
        return {} as any;
      });

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
