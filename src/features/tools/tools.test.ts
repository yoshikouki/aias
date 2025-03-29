import { beforeEach, describe, expect, test, vi } from "vitest";
import { InMemoryFSAdapter } from "../../lib/in-memory-fs-adapter";
import { listFile, readFile, writeFile } from "./tools";

describe("tools", () => {
  let fsAdapter: InMemoryFSAdapter;

  beforeEach(() => {
    fsAdapter = new InMemoryFSAdapter();
  });

  describe("listFile", () => {
    test("ディレクトリの内容を取得できること", async () => {
      await fsAdapter.writeFile("test.txt", "test content", "utf-8");
      const result = await listFile({ path: ".", recursive: true }, { fsAdapter });
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.result).toBe("Directory . contents:\ntest.txt");
      }
    });

    test("存在しないディレクトリを指定するとエラーを返すこと", async () => {
      const result = await listFile({ path: "not_exists", recursive: true }, { fsAdapter });
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe("LIST_FILE_ERROR");
      }
    });
  });

  describe("readFile", () => {
    test("ファイルの内容を取得できること", async () => {
      await fsAdapter.writeFile("test.txt", "test content", "utf-8");
      const result = await readFile({ path: "test.txt" }, { fsAdapter });
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.result).toBe("test content");
      }
    });

    test("存在しないファイルを指定するとエラーを返すこと", async () => {
      const result = await readFile({ path: "not_exists.txt" }, { fsAdapter });
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe("READ_FILE_ERROR");
      }
    });
  });

  describe("writeFile", () => {
    test("ファイルに内容を書き込めること", async () => {
      const result = await writeFile(
        {
          path: "test.txt",
          content: "test content",
        },
        { fsAdapter },
      );
      expect(result.ok).toBe(true);
      if (result.ok) {
        const content = await fsAdapter.readFile("test.txt", "utf-8");
        expect(content).toBe("test content");
      }
    });

    test("書き込みに失敗するとエラーを返すこと", async () => {
      // 読み取り専用のファイルシステムをシミュレート
      vi.spyOn(fsAdapter, "writeFile").mockRejectedValueOnce(new Error("Permission denied"));
      const result = await writeFile(
        {
          path: "test.txt",
          content: "test content",
        },
        { fsAdapter },
      );
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe("WRITE_FILE_ERROR");
      }
    });
  });
});
