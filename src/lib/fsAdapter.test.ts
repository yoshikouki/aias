import { describe, expect, test } from "vitest";
import { InMemoryFSAdapter } from "./fsAdapter";

describe("InMemoryFSAdapter", () => {
  test("readdir should return list of files in a directory", async () => {
    const adapter = new InMemoryFSAdapter({
      "/test/file1.txt": "content1",
      "/test/file2.txt": "content2",
      "/test/subdir/file3.txt": "content3",
    });

    const files = await adapter.readdir("/test");
    expect(files).toEqual(["file1.txt", "file2.txt", "subdir"]);
  });

  test("readdir with recursive option should return all files", async () => {
    const adapter = new InMemoryFSAdapter({
      "/test/file1.txt": "content1",
      "/test/subdir/file2.txt": "content2",
      "/test/subdir/nested/file3.txt": "content3",
    });

    const files = await adapter.readdir("/test", { recursive: true });
    expect(files).toEqual(["file1.txt", "subdir/file2.txt", "subdir/nested/file3.txt"]);
  });

  test("readFile should return file content", async () => {
    const adapter = new InMemoryFSAdapter({
      "/test.txt": "test content",
    });

    const content = await adapter.readFile("/test.txt", "utf-8");
    expect(content).toBe("test content");
  });

  test("readFile should throw error for non-existent file", async () => {
    const adapter = new InMemoryFSAdapter();

    await expect(adapter.readFile("/nonexistent.txt", "utf-8")).rejects.toThrow(
      "ENOENT: no such file or directory",
    );
  });

  test("writeFile should write content to file", async () => {
    const adapter = new InMemoryFSAdapter();

    await adapter.writeFile("/test.txt", "new content", "utf-8");
    const content = await adapter.readFile("/test.txt", "utf-8");
    expect(content).toBe("new content");
  });

  test("writeFile should overwrite existing file", async () => {
    const adapter = new InMemoryFSAdapter({
      "/test.txt": "old content",
    });

    await adapter.writeFile("/test.txt", "new content", "utf-8");
    const content = await adapter.readFile("/test.txt", "utf-8");
    expect(content).toBe("new content");
  });
});
