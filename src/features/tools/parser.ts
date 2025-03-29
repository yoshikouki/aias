import type { FSAdapter } from "../../lib/fsAdapter";
import { failure, success } from "../../lib/result";
import * as tools from "./tools";
import type {
  Result,
  Tool,
  ToolError,
  ToolExecutionResult,
  ToolResult,
  ToolType,
} from "./types";

/**
 * AIの応答からツール呼び出しを解析し、実行する
 */
export async function parseAndExecuteTool(
  response: string,
  fsAdapter?: FSAdapter,
): Promise<ToolExecutionResult> {
  const parsedTool = parseTool(response);

  if (!parsedTool.ok) {
    return {
      toolResult: parsedTool,
      isComplete: false,
    };
  }

  const toolResult = await executeTool(parsedTool.result, fsAdapter);
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
    return failure({
      message: "No valid tool found in response",
      code: "PARSE_ERROR",
    });
  }

  const [, toolType, content] = toolMatch;

  if (!isValidToolType(toolType)) {
    return failure({
      message: `Unknown tool type: ${toolType}`,
      code: "UNKNOWN_TOOL",
    });
  }

  if (!content) {
    return failure({
      message: "Tool content is empty",
      code: "PARSE_ERROR",
    });
  }

  return parseParams(toolType, content.trim());
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
function parseParams(toolType: ToolType, content: string | undefined): Result<Tool, ToolError> {
  if (!content) {
    const errorMessages: Record<ToolType, string> = {
      list_file: "Missing path parameter for list_file tool",
      read_file: "Missing path parameter for read_file tool",
      write_file: "Missing path parameter for write_file tool",
      ask_question: "Missing question parameter for ask_question tool",
      execute_command: "Missing command parameter for execute_command tool",
      complete: "Missing result parameter for complete tool",
    };

    return failure({
      message: errorMessages[toolType],
      code: "MISSING_PARAM",
    });
  }

  try {
    switch (toolType) {
      case "list_file": {
        const pathMatch = content.match(/<path>([\s\S]*?)<\/path>/);
        const recursiveMatch = content.match(/<recursive>([\s\S]*?)<\/recursive>/);

        if (!pathMatch || !pathMatch[1]) {
          return failure({
            message: "Missing path parameter for list_file tool",
            code: "MISSING_PARAM",
          });
        }

        return success({
          type: "list_file",
          params: {
            path: pathMatch[1].trim(),
            recursive: recursiveMatch?.[1]?.trim().toLowerCase() === "true",
          },
        });
      }

      case "read_file": {
        const readPathMatch = content.match(/<path>([\s\S]*?)<\/path>/);

        if (!readPathMatch || !readPathMatch[1]) {
          return failure({
            message: "Missing path parameter for read_file tool",
            code: "MISSING_PARAM",
          });
        }

        return success({
          type: "read_file",
          params: { path: readPathMatch[1].trim() },
        });
      }

      case "write_file": {
        const writePathMatch = content.match(/<path>([\s\S]*?)<\/path>/);
        const contentMatch = content.match(/<content>([\s\S]*?)<\/content>/);

        if (!writePathMatch || !writePathMatch[1]) {
          return failure({
            message: "Missing path parameter for write_file tool",
            code: "MISSING_PARAM",
          });
        }

        if (!contentMatch || !contentMatch[1]) {
          return failure({
            message: "Missing content parameter for write_file tool",
            code: "MISSING_PARAM",
          });
        }

        return success({
          type: "write_file",
          params: {
            path: writePathMatch[1].trim(),
            content: contentMatch[1].trim(),
          },
        });
      }

      case "ask_question": {
        const questionMatch = content.match(/<question>([\s\S]*?)<\/question>/);

        if (!questionMatch || !questionMatch[1]) {
          return failure({
            message: "Missing question parameter for ask_question tool",
            code: "MISSING_PARAM",
          });
        }

        return success({
          type: "ask_question",
          params: { question: questionMatch[1].trim() },
        });
      }

      case "execute_command": {
        const commandMatch = content.match(/<command>([\s\S]*?)<\/command>/);

        if (!commandMatch || !commandMatch[1]) {
          return failure({
            message: "Missing command parameter for execute_command tool",
            code: "MISSING_PARAM",
          });
        }

        return success({
          type: "execute_command",
          params: { command: commandMatch[1].trim() },
        });
      }

      case "complete": {
        const resultMatchR = content.match(/<r>([\s\S]*?)<\/r>/);
        const resultMatchResult = content.match(/<result>([\s\S]*?)<\/result>/);
        const resultMatch = resultMatchR || resultMatchResult;

        if (!resultMatch || !resultMatch[1]) {
          return failure({
            message: "Missing result parameter for complete tool",
            code: "MISSING_PARAM",
          });
        }

        return success({
          type: "complete",
          params: { result: resultMatch[1].trim() },
        });
      }
    }
  } catch (error) {
    return failure({
      message: error instanceof Error ? error.message : "Failed to parse tool parameters",
      code: "PARSE_ERROR",
    });
  }
}

/**
 * ツールを実行する
 */
async function executeTool(tool: Tool, fsAdapter?: FSAdapter): Promise<ToolResult> {
  const deps = fsAdapter ? { fsAdapter } : {};
  switch (tool.type) {
    case "list_file":
      return tools.listFile(tool.params, deps);
    case "read_file":
      return tools.readFile(tool.params, deps);
    case "write_file":
      return tools.writeFile(tool.params, deps);
    case "ask_question":
      return tools.askQuestion(tool.params, deps);
    case "execute_command":
      return tools.executeCommand(tool.params, deps);
    case "complete":
      return tools.complete(tool.params);
  }
}
