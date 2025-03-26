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

export type Tool =
  | { type: "list_file"; params: ListFileParams }
  | { type: "read_file"; params: ReadFileParams }
  | { type: "write_file"; params: WriteFileParams }
  | { type: "ask_question"; params: AskQuestionParams }
  | { type: "execute_command"; params: ExecuteCommandParams }
  | { type: "complete"; params: CompleteParams };

export interface ToolExecutionResult {
  toolResult: ToolResult;
  isComplete: boolean;
}
