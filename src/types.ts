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
