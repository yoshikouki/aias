import type { Dirent } from "node:fs";
import { readFile, readdir, writeFile } from "node:fs/promises";
import { describe, expect, test, vi } from "vitest";
import { defaultFSAdapter } from "./fsAdapter";

vi.mock("node:fs/promises", () => ({
  readdir: vi.fn(),
  readFile: vi.fn(),
  writeFile: vi.fn(),
}));

describe("FSAdapter", () => {
  test("readdir should return list of files", async () => {
    const mockFiles: (string | Dirent)[] = ["file1.txt", "file2.txt"];
    (readdir as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(mockFiles);

    const result = await defaultFSAdapter.readdir("/test");
    expect(result).toEqual(mockFiles);
    expect(readdir).toHaveBeenCalledWith("/test");
  });

  test("readFile should return file content", async () => {
    const mockContent = "test content";
    (readFile as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(mockContent);

    const result = await defaultFSAdapter.readFile("/test.txt", "utf-8");
    expect(result).toBe(mockContent);
    expect(readFile).toHaveBeenCalledWith("/test.txt", "utf-8");
  });

  test("writeFile should write content to file", async () => {
    const content = "test content";
    (writeFile as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

    await defaultFSAdapter.writeFile("/test.txt", content, "utf-8");
    expect(writeFile).toHaveBeenCalledWith("/test.txt", content, "utf-8");
  });
});
