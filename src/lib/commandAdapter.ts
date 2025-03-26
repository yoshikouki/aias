import { exec } from "node:child_process";
import { promisify } from "node:util";

const execAsync = promisify(exec);

export interface CommandAdapter {
  execute(command: string): Promise<{ stdout: string; stderr: string }>;
}

export class NodeCommandAdapter implements CommandAdapter {
  async execute(command: string): Promise<{ stdout: string; stderr: string }> {
    return await execAsync(command);
  }
}

export class MockCommandAdapter implements CommandAdapter {
  constructor(
    private mockResult: { stdout: string; stderr: string } = { stdout: "", stderr: "" },
  ) {}

  async execute(_command: string): Promise<{ stdout: string; stderr: string }> {
    return this.mockResult;
  }
}
