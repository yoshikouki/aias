import { promises as fs } from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';
import {
  ToolResponse,
  ListFileParams,
  ReadFileParams,
  WriteFileParams,
  AskQuestionParams,
  ExecuteCommandParams,
  CompleteParams,
} from './types';

const execAsync = promisify(exec);

export async function listFile(params: ListFileParams): Promise<ToolResponse> {
  try {
    const files = await fs.readdir(params.path, { recursive: params.recursive });
    const result = `Directory ${params.path} contents:\n${files.join('\n')}`;
    return { success: true, message: result };
  } catch (error) {
    return { success: false, message: `Failed to list directory: ${error}` };
  }
}

export async function readFile(params: ReadFileParams): Promise<ToolResponse> {
  try {
    const content = await fs.readFile(params.path, 'utf-8');
    return { success: true, message: content };
  } catch (error) {
    return { success: false, message: `Failed to read file: ${error}` };
  }
}

export async function writeFile(params: WriteFileParams): Promise<ToolResponse> {
  try {
    await fs.writeFile(params.path, params.content, 'utf-8');
    return { success: true, message: `Successfully wrote to ${params.path}` };
  } catch (error) {
    return { success: false, message: `Failed to write file: ${error}` };
  }
}

export async function askQuestion(params: AskQuestionParams): Promise<ToolResponse> {
  console.log(`\nQuestion: ${params.question}`);
  const answer = await new Promise<string>((resolve) => {
    process.stdin.once('data', (data) => resolve(data.toString().trim()));
  });
  return { success: true, message: `User answered: ${answer}` };
}

export async function executeCommand(params: ExecuteCommandParams): Promise<ToolResponse> {
  if (params.requiresApproval) {
    console.log(`\nExecute command?\n${params.command}\n[y/n]: `);
    const answer = await new Promise<string>((resolve) => {
      process.stdin.once('data', (data) => resolve(data.toString().trim()));
    });
    if (answer.toLowerCase() !== 'y') {
      return { success: false, message: 'Command execution cancelled' };
    }
  }

  try {
    const { stdout, stderr } = await execAsync(params.command);
    return { success: true, message: `Command output:\n${stdout}\n${stderr}` };
  } catch (error) {
    return { success: false, message: `Command execution failed: ${error}` };
  }
}

export async function complete(params: CompleteParams): Promise<ToolResponse> {
  return { success: true, message: `Task completed: ${params.result}` };
} 