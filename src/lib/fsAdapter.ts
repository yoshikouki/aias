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
