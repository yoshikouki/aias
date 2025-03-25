import * as tools from "./tools";
import type {
  AskQuestionParams,
  CompleteParams,
  ExecuteCommandParams,
  ListFileParams,
  ReadFileParams,
  Result,
  Tool,
  ToolError,
  ToolExecutionResult,
  ToolResult,
  ToolType,
  WriteFileParams,
} from "./types";

/**
 * AIの応答からツール呼び出しを解析し、実行する
 */
export async function parseAndExecuteTool(response: string): Promise<ToolExecutionResult> {
  const parsedTool = parseTool(response);

  if (!parsedTool.ok) {
    return {
      toolResult: parsedTool,
      isComplete: false,
    };
  }

  const toolResult = await executeTool(parsedTool.result);
  return {
    toolResult,
    isComplete: parsedTool.result.type === "complete",
  };
}

/**
 * AIの応答からツール呼び出しを解析する
 */
export function parseTool(response: string): Result<Tool, ToolError> {
  const toolMatch = response.match(/<([a-z_]+)>([\s\S]*?)<\/\1>/);
  if (!toolMatch) {
    return {
      ok: false,
      error: { message: "No valid tool found in response", code: "PARSE_ERROR" },
    };
  }

  const [, toolType, content] = toolMatch;

  if (!isValidToolType(toolType)) {
    return {
      ok: false,
      error: {
        message: `Unknown tool type: ${toolType}`,
        code: "INVALID_TOOL_TYPE",
      },
    };
  }

  const params = parseParams(toolType, content);

  if (!params.ok) {
    return params;
  }

  return {
    ok: true,
    result: {
      type: toolType,
      params: params.result,
    },
  };
}

/**
 * ツールタイプが有効かチェックする
 */
function isValidToolType(type: string | undefined): type is ToolType {
  if (!type) return false;

  const validTypes: ToolType[] = [
    "list_file",
    "read_file",
    "write_file",
    "ask_question",
    "execute_command",
    "complete",
  ];
  return validTypes.includes(type as ToolType);
}

/**
 * ツールのパラメータを解析する
 */
function parseParams(
  toolType: ToolType,
  content: string | undefined,
): Result<
  | ListFileParams
  | ReadFileParams
  | WriteFileParams
  | AskQuestionParams
  | ExecuteCommandParams
  | CompleteParams,
  ToolError
> {
  if (!content) {
    const errorMessages: Record<ToolType, string> = {
      list_file: "Missing path parameter for list_file tool",
      read_file: "Missing path parameter for read_file tool",
      write_file: "Missing path parameter for write_file tool",
      ask_question: "Missing question parameter for ask_question tool",
      execute_command: "Missing command parameter for execute_command tool",
      complete: "Missing result parameter for complete tool",
    };

    return {
      ok: false,
      error: {
        message: errorMessages[toolType],
        code: "MISSING_PARAM",
      },
    };
  }

  try {
    switch (toolType) {
      case "list_file": {
        const pathMatch = content.match(/<path>(.*?)<\/path>/);
        const recursiveMatch = content.match(/<recursive>(.*?)<\/recursive>/);

        if (!pathMatch || !pathMatch[1]) {
          return {
            ok: false,
            error: {
              message: "Missing path parameter for list_file tool",
              code: "MISSING_PARAM",
            },
          };
        }

        return {
          ok: true,
          result: {
            path: pathMatch[1],
            recursive: recursiveMatch?.[1]?.toLowerCase() === "true",
          },
        };
      }

      case "read_file": {
        const readPathMatch = content.match(/<path>(.*?)<\/path>/);

        if (!readPathMatch || !readPathMatch[1]) {
          return {
            ok: false,
            error: {
              message: "Missing path parameter for read_file tool",
              code: "MISSING_PARAM",
            },
          };
        }

        return {
          ok: true,
          result: { path: readPathMatch[1] },
        };
      }

      case "write_file": {
        const writePathMatch = content.match(/<path>(.*?)<\/path>/);
        const contentMatch = content.match(/<content>([\s\S]*?)<\/content>/);

        if (!writePathMatch || !writePathMatch[1]) {
          return {
            ok: false,
            error: {
              message: "Missing path parameter for write_file tool",
              code: "MISSING_PARAM",
            },
          };
        }

        if (!contentMatch || !contentMatch[1]) {
          return {
            ok: false,
            error: {
              message: "Missing content parameter for write_file tool",
              code: "MISSING_PARAM",
            },
          };
        }

        return {
          ok: true,
          result: {
            path: writePathMatch[1],
            content: contentMatch[1],
          },
        };
      }

      case "ask_question": {
        const questionMatch = content.match(/<question>(.*?)<\/question>/);

        if (!questionMatch || !questionMatch[1]) {
          return {
            ok: false,
            error: {
              message: "Missing question parameter for ask_question tool",
              code: "MISSING_PARAM",
            },
          };
        }

        return {
          ok: true,
          result: { question: questionMatch[1] },
        };
      }

      case "execute_command": {
        const commandMatch = content.match(/<command>(.*?)<\/command>/);
        const approvalMatch = content.match(/<requires_approval>(.*?)<\/requires_approval>/);

        if (!commandMatch || !commandMatch[1]) {
          return {
            ok: false,
            error: {
              message: "Missing command parameter for execute_command tool",
              code: "MISSING_PARAM",
            },
          };
        }

        return {
          ok: true,
          result: {
            command: commandMatch[1],
            requiresApproval: approvalMatch?.[1]
              ? approvalMatch[1].toLowerCase() === "true"
              : true,
          },
        };
      }

      case "complete": {
        const resultMatchR = content.match(/<r>(.*?)<\/r>/);
        const resultMatchResult = content.match(/<result>(.*?)<\/result>/);
        const resultMatch = resultMatchR || resultMatchResult;

        if (!resultMatch || !resultMatch[1]) {
          return {
            ok: false,
            error: {
              message: "Missing result parameter for complete tool",
              code: "MISSING_PARAM",
            },
          };
        }

        return {
          ok: true,
          result: { result: resultMatch[1] },
        };
      }

      default:
        return {
          ok: false,
          error: {
            message: `Unknown tool type: ${toolType}`,
            code: "INVALID_TOOL_TYPE",
          },
        };
    }
  } catch (error) {
    return {
      ok: false,
      error: {
        message: `Error parsing parameters for ${toolType}: ${error instanceof Error ? error.message : String(error)}`,
        code: "PARSE_ERROR",
      },
    };
  }
}

/**
 * ツールを実行する
 */
async function executeTool(tool: Tool): Promise<ToolResult> {
  switch (tool.type) {
    case "list_file":
      return tools.listFile(tool.params as ListFileParams);
    case "read_file":
      return tools.readFile(tool.params as ReadFileParams);
    case "write_file":
      return tools.writeFile(tool.params as WriteFileParams);
    case "ask_question":
      return tools.askQuestion(tool.params as AskQuestionParams);
    case "execute_command":
      return tools.executeCommand(tool.params as ExecuteCommandParams);
    case "complete":
      return tools.complete(tool.params as CompleteParams);
    default:
      return {
        ok: false,
        error: {
          message: `Unknown tool type: ${tool.type}`,
          code: "INVALID_TOOL_TYPE",
        },
      };
  }
}
