import * as tools from "./tools";
import type {
  AskQuestionParams,
  CompleteParams,
  ExecuteCommandParams,
  ListFileParams,
  ReadFileParams,
  Tool,
  ToolResponse,
  ToolType,
  WriteFileParams,
} from "./types";

export async function parseAndExecuteTool(
  response: string,
): Promise<{ response: ToolResponse; isComplete: boolean }> {
  const toolMatch = response.match(/<([a-z_]+)>([\s\S]*?)<\/\1>/);
  if (!toolMatch) {
    return {
      response: { success: false, message: "No valid tool found" },
      isComplete: false,
    };
  }

  const [, toolType, content] = toolMatch;
  const params = parseParams(toolType as ToolType, content);

  if (!params) {
    return {
      response: { success: false, message: `Failed to parse parameters for tool: ${toolType}` },
      isComplete: false,
    };
  }

  const tool: Tool = {
    type: toolType as ToolType,
    params,
  };

  const toolResponse = await executeTool(tool);
  return {
    response: toolResponse,
    isComplete: toolType === "complete",
  };
}

function parseParams(
  toolType: ToolType,
  content: string,
):
  | ListFileParams
  | ReadFileParams
  | WriteFileParams
  | AskQuestionParams
  | ExecuteCommandParams
  | CompleteParams
  | null {
  try {
    switch (toolType) {
      case "list_file": {
        const pathMatch = content.match(/<path>(.*?)<\/path>/);
        const recursiveMatch = content.match(/<recursive>(.*?)<\/recursive>/);
        if (!pathMatch) return null;
        return {
          path: pathMatch[1],
          recursive: recursiveMatch ? recursiveMatch[1].toLowerCase() === "true" : false,
        };
      }

      case "read_file": {
        const readPathMatch = content.match(/<path>(.*?)<\/path>/);
        if (!readPathMatch) return null;
        return { path: readPathMatch[1] };
      }

      case "write_file": {
        const writePathMatch = content.match(/<path>(.*?)<\/path>/);
        const contentMatch = content.match(/<content>([\s\S]*?)<\/content>/);
        if (!writePathMatch || !contentMatch) return null;
        return {
          path: writePathMatch[1],
          content: contentMatch[1],
        };
      }

      case "ask_question": {
        const questionMatch = content.match(/<question>(.*?)<\/question>/);
        if (!questionMatch) return null;
        return { question: questionMatch[1] };
      }

      case "execute_command": {
        const commandMatch = content.match(/<command>(.*?)<\/command>/);
        const approvalMatch = content.match(/<requires_approval>(.*?)<\/requires_approval>/);
        if (!commandMatch) return null;
        return {
          command: commandMatch[1],
          requiresApproval: approvalMatch ? approvalMatch[1].toLowerCase() === "true" : false,
        };
      }

      case "complete": {
        const resultMatch = content.match(/<result>(.*?)<\/result>/);
        if (!resultMatch) return null;
        return { result: resultMatch[1] };
      }

      default:
        return null;
    }
  } catch (error) {
    console.error(`Error parsing parameters for ${toolType}:`, error);
    return null;
  }
}

async function executeTool(tool: Tool): Promise<ToolResponse> {
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
      return { success: false, message: `Unknown tool type: ${tool.type}` };
  }
}
