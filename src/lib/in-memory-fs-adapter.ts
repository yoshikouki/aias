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

  /**
   * ファイルを読み込む
   */
  async readFile(path: string, encoding: BufferEncoding): Promise<string> {
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
    this.files.set(path, { content: data, encoding });
  }

  /**
   * ディレクトリの内容を読み込む
   */
  async readdir(path: string, options?: { recursive?: boolean }): Promise<(string | Dirent)[]> {
    const files = Array.from(this.files.keys())
      .filter((filePath) => filePath.startsWith(path))
      .map((filePath) => filePath.slice(path.length + 1).split("/")[0])
      .filter((name) => name.length > 0);

    return [...new Set(files)];
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
