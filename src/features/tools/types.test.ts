import { describe, expect, test } from "vitest";
import type { Tool, ToolError, ToolExecutionResult, ToolResult } from "./types";

describe("ToolError", () => {
  test("ToolErrorの型が正しく定義されていること", () => {
    const error: ToolError = {
      message: "Failed to read file",
      code: "READ_FILE_ERROR",
    };
    expect(error).toBeDefined();
    expect(error.message).toBe("Failed to read file");
    expect(error.code).toBe("READ_FILE_ERROR");
  });

  test("codeが省略可能であること", () => {
    const error: ToolError = {
      message: "Unknown error",
    };
    expect(error).toBeDefined();
    expect(error.message).toBe("Unknown error");
    expect(error.code).toBeUndefined();
  });
});

describe("ToolResult", () => {
  test("成功時の型が正しく定義されていること", () => {
    const success: ToolResult = {
      ok: true,
      result: "Success message",
    };
    expect(success.ok).toBe(true);
    if (success.ok) {
      expect(success.result).toBe("Success message");
    }
  });

  test("失敗時の型が正しく定義されていること", () => {
    const failure: ToolResult = {
      ok: false,
      error: {
        message: "Error message",
        code: "ERROR_CODE",
      },
    };
    expect(failure.ok).toBe(false);
    if (!failure.ok) {
      expect(failure.error.message).toBe("Error message");
      expect(failure.error.code).toBe("ERROR_CODE");
    }
  });
});

describe("Tool", () => {
  test("list_fileツールの型が正しく定義されていること", () => {
    const tool: Tool = {
      type: "list_file",
      params: {
        path: "test",
        recursive: true,
      },
    };
    expect(tool.type).toBe("list_file");
    expect(tool.params.path).toBe("test");
    expect(tool.params.recursive).toBe(true);
  });

  test("read_fileツールの型が正しく定義されていること", () => {
    const tool: Tool = {
      type: "read_file",
      params: {
        path: "test.txt",
      },
    };
    expect(tool.type).toBe("read_file");
    expect(tool.params.path).toBe("test.txt");
  });

  test("write_fileツールの型が正しく定義されていること", () => {
    const tool: Tool = {
      type: "write_file",
      params: {
        path: "test.txt",
        content: "test content",
      },
    };
    expect(tool.type).toBe("write_file");
    expect(tool.params.path).toBe("test.txt");
    expect(tool.params.content).toBe("test content");
  });

  test("ask_questionツールの型が正しく定義されていること", () => {
    const tool: Tool = {
      type: "ask_question",
      params: {
        question: "What is the answer?",
      },
    };
    expect(tool.type).toBe("ask_question");
    expect(tool.params.question).toBe("What is the answer?");
  });

  test("execute_commandツールの型が正しく定義されていること", () => {
    const tool: Tool = {
      type: "execute_command",
      params: {
        command: "ls -la",
      },
    };
    expect(tool.type).toBe("execute_command");
    expect(tool.params.command).toBe("ls -la");
  });

  test("completeツールの型が正しく定義されていること", () => {
    const tool: Tool = {
      type: "complete",
      params: {
        result: "Task completed",
      },
    };
    expect(tool.type).toBe("complete");
    expect(tool.params.result).toBe("Task completed");
  });
});

describe("ToolExecutionResult", () => {
  test("ToolExecutionResultの型が正しく定義されていること", () => {
    const result: ToolExecutionResult = {
      toolResult: {
        ok: true,
        result: "Success",
      },
      isComplete: true,
    };
    expect(result.toolResult.ok).toBe(true);
    if (result.toolResult.ok) {
      expect(result.toolResult.result).toBe("Success");
    }
    expect(result.isComplete).toBe(true);
  });

  test("失敗時のToolExecutionResultの型が正しく定義されていること", () => {
    const result: ToolExecutionResult = {
      toolResult: {
        ok: false,
        error: {
          message: "Error",
          code: "ERROR_CODE",
        },
      },
      isComplete: false,
    };
    expect(result.toolResult.ok).toBe(false);
    if (!result.toolResult.ok) {
      expect(result.toolResult.error.message).toBe("Error");
      expect(result.toolResult.error.code).toBe("ERROR_CODE");
    }
    expect(result.isComplete).toBe(false);
  });
});
