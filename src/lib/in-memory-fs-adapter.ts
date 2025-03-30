import type { Dirent } from "node:fs";
import type { FSAdapter } from "./fsAdapter";

interface InMemoryFile {
  content: string;
  encoding: BufferEncoding;
}

/**
 * テスト用のインメモリファイルシステム
 */
export class InMemoryFSAdapter implements FSAdapter {
  private files: Map<string, InMemoryFile> = new Map();
  private readonly readOnly: boolean;

  constructor(options: { readOnly?: boolean } = {}) {
    this.readOnly = options.readOnly ?? false;
  }

  /**
   * ファイルを読み込む
   */
  async readFile(path: string, _encoding: BufferEncoding): Promise<string> {
    const file = this.files.get(path);
    if (!file) {
      throw new Error(`ENOENT: no such file or directory, open '${path}'`);
    }
    return file.content;
  }

  /**
   * ファイルを書き込む
   */
  async writeFile(path: string, data: string, encoding: BufferEncoding): Promise<void> {
    if (this.readOnly) {
      throw new Error("Permission denied: filesystem is read-only");
    }
    this.files.set(path, { content: data, encoding });
  }

  /**
   * ディレクトリの内容を読み込む
   */
  async readdir(path: string, options?: { recursive?: boolean }): Promise<(string | Dirent)[]> {
    if (path === ".") {
      return Array.from(this.files.keys())
        .map((filePath) => {
          const parts = filePath.split("/");
          return parts[0];
        })
        .filter((name): name is string => name !== undefined);
    }

    // パスがディレクトリの場合は、そのディレクトリ内のファイルを返す
    const dirFiles = Array.from(this.files.keys())
      .filter((filePath) => {
        if (options?.recursive) {
          return filePath.startsWith(`${path}/`);
        }
        const parts = filePath.split("/");
        return parts.length > 1 && parts[0] === path;
      })
      .map((filePath) => {
        const parts = filePath.split("/");
        return parts[1];
      })
      .filter((name): name is string => name !== undefined);

    if (dirFiles.length === 0) {
      throw new Error(`ENOENT: no such file or directory, scandir '${path}'`);
    }

    return dirFiles;
  }

  /**
   * ファイルの存在を確認
   */
  hasFile(path: string): boolean {
    return this.files.has(path);
  }

  /**
   * ファイルの内容を取得
   */
  getFile(path: string): InMemoryFile | undefined {
    return this.files.get(path);
  }

  /**
   * 全てのファイルをクリア
   */
  clear(): void {
    this.files.clear();
  }
}
