import type { Dirent } from "node:fs";
import { readFile, readdir, writeFile } from "node:fs/promises";

export interface FSAdapter {
  readdir(path: string, options?: { recursive?: boolean }): Promise<(string | Dirent)[]>;
  readFile(path: string, encoding: BufferEncoding): Promise<string>;
  writeFile(path: string, data: string, encoding: BufferEncoding): Promise<void>;
}

export const defaultFSAdapter: FSAdapter = {
  readdir,
  readFile,
  writeFile,
};

export class InMemoryFSAdapter implements FSAdapter {
  private files: Map<string, string>;

  constructor(initialFiles: Record<string, string> = {}) {
    this.files = new Map(Object.entries(initialFiles));
  }

  async readdir(path: string, options?: { recursive?: boolean }): Promise<string[]> {
    const normalizedPath = path.endsWith("/") ? path : `${path}/`;
    const allPaths = Array.from(this.files.keys())
      .filter((key) => key.startsWith(normalizedPath))
      .map((key) => key.slice(normalizedPath.length));

    if (options?.recursive) {
      return allPaths.filter((name) => name !== "");
    }

    // 直下のファイルとディレクトリを抽出
    const result = new Set<string>();
    for (const name of allPaths) {
      if (name === "") continue;
      const parts = name.split("/");
      result.add(parts[0]);
    }

    return Array.from(result);
  }

  async readFile(path: string, _encoding: BufferEncoding): Promise<string> {
    const content = this.files.get(path);
    if (content === undefined) {
      throw new Error(`ENOENT: no such file or directory, open '${path}'`);
    }
    return content;
  }

  async writeFile(path: string, data: string, _encoding: BufferEncoding): Promise<void> {
    this.files.set(path, data);
  }

  // テストヘルパーメソッド
  getFiles(): Map<string, string> {
    return new Map(this.files);
  }

  clear(): void {
    this.files.clear();
  }
}
