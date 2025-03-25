export type Success<T> = { ok: true; result: T };
export type Failure<E> = { ok: false; error: E };
export type Result<T, E> = Success<T> | Failure<E>;

export type ToolError = {
  message: string;
  code?: string;
};

export type ToolSuccess<T = string> = T;
export type ToolResult<T = string> = Result<T, ToolError>;

export interface ToolResponse {
  success: boolean;
  message: string;
}

export interface ListFileParams {
  path: string;
  recursive: boolean;
}

export interface ReadFileParams {
  path: string;
}

export interface WriteFileParams {
  path: string;
  content: string;
}

export interface AskQuestionParams {
  question: string;
}

export interface ExecuteCommandParams {
  command: string;
  requiresApproval: boolean;
}

export interface CompleteParams {
  result: string;
}

export type ToolType =
  | "list_file"
  | "read_file"
  | "write_file"
  | "ask_question"
  | "execute_command"
  | "complete";

export interface Tool {
  type: ToolType;
  params:
    | ListFileParams
    | ReadFileParams
    | WriteFileParams
    | AskQuestionParams
    | ExecuteCommandParams
    | CompleteParams;
}

export interface ToolExecutionResult {
  toolResult: ToolResult;
  isComplete: boolean;
}
