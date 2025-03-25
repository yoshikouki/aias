import { expect, test, describe, vi, beforeEach } from "vitest";
import { parseTool } from "./parser";
import type { Tool } from "./types";

test("無効なレスポンスに対してエラーを返すこと", () => {
  const invalidResponse = "これは有効なツール呼び出しではありません";
  const result = parseTool(invalidResponse);

  expect(result.ok).toBe(false);
  expect(result.error.message).toContain("No valid tool found");
  expect(result.error.code).toBe("PARSE_ERROR");
});

test("未知のツールタイプに対してエラーを返すこと", () => {
  const invalidToolResponse = "<unknown_tool><path>some/path</path></unknown_tool>";
  const result = parseTool(invalidToolResponse);

  expect(result.ok).toBe(false);
  expect(result.error.message).toContain("Unknown tool type");
  expect(result.error.code).toBe("INVALID_TOOL_TYPE");
});

describe("list_fileツールの解析", () => {
  test("パスのみ指定された場合に正しく解析すること", () => {
    const response = "<list_file><path>src</path></list_file>";
    const result = parseTool(response);

    expect(result.ok).toBe(true);
    if (result.ok) {
      const tool = result.result as Tool;
      expect(tool.type).toBe("list_file");
      expect(tool.params).toEqual({ path: "src", recursive: false });
    }
  });

  test("パスと再帰的フラグが指定された場合に正しく解析すること", () => {
    const response = "<list_file><path>src</path><recursive>true</recursive></list_file>";
    const result = parseTool(response);

    expect(result.ok).toBe(true);
    if (result.ok) {
      const tool = result.result as Tool;
      expect(tool.type).toBe("list_file");
      expect(tool.params).toEqual({ path: "src", recursive: true });
    }
  });

  test("パスが指定されていない場合にエラーを返すこと", () => {
    const response = "<list_file><recursive>true</recursive></list_file>";
    const result = parseTool(response);

    expect(result.ok).toBe(false);
    expect(result.error.message).toContain("Missing path parameter");
    expect(result.error.code).toBe("MISSING_PARAM");
  });
});

describe("read_fileツールの解析", () => {
  test("パスが指定された場合に正しく解析すること", () => {
    const response = "<read_file><path>src/index.ts</path></read_file>";
    const result = parseTool(response);

    expect(result.ok).toBe(true);
    if (result.ok) {
      const tool = result.result as Tool;
      expect(tool.type).toBe("read_file");
      expect(tool.params).toEqual({ path: "src/index.ts" });
    }
  });

  test("パスが指定されていない場合にエラーを返すこと", () => {
    const response = "<read_file></read_file>";
    const result = parseTool(response);

    expect(result.ok).toBe(false);
    expect(result.error.message).toContain("Missing path parameter");
    expect(result.error.code).toBe("MISSING_PARAM");
  });
});

describe("write_fileツールの解析", () => {
  test("パスと内容が指定された場合に正しく解析すること", () => {
    const response =
      "<write_file><path>test.txt</path><content>Hello, world!</content></write_file>";
    const result = parseTool(response);

    expect(result.ok).toBe(true);
    if (result.ok) {
      const tool = result.result as Tool;
      expect(tool.type).toBe("write_file");
      expect(tool.params).toEqual({
        path: "test.txt",
        content: "Hello, world!",
      });
    }
  });

  test("パスが指定されていない場合にエラーを返すこと", () => {
    const response = "<write_file><content>Hello, world!</content></write_file>";
    const result = parseTool(response);

    expect(result.ok).toBe(false);
    expect(result.error.message).toContain("Missing path parameter");
  });

  test("内容が指定されていない場合にエラーを返すこと", () => {
    const response = "<write_file><path>test.txt</path></write_file>";
    const result = parseTool(response);

    expect(result.ok).toBe(false);
    expect(result.error.message).toContain("Missing content parameter");
  });
});

describe("ask_questionツールの解析", () => {
  test("質問が指定された場合に正しく解析すること", () => {
    const response = "<ask_question><question>What is your name?</question></ask_question>";
    const result = parseTool(response);

    expect(result.ok).toBe(true);
    if (result.ok) {
      const tool = result.result as Tool;
      expect(tool.type).toBe("ask_question");
      expect(tool.params).toEqual({ question: "What is your name?" });
    }
  });

  test("質問が指定されていない場合にエラーを返すこと", () => {
    const response = "<ask_question></ask_question>";
    const result = parseTool(response);

    expect(result.ok).toBe(false);
    expect(result.error.message).toContain("Missing question parameter");
  });
});

describe("execute_commandツールの解析", () => {
  test("コマンドのみ指定された場合にデフォルトでrequiresApprovalがtrueになること", () => {
    const response = "<execute_command><command>ls -la</command></execute_command>";
    const result = parseTool(response);

    expect(result.ok).toBe(true);
    if (result.ok) {
      const tool = result.result as Tool;
      expect(tool.type).toBe("execute_command");
      expect(tool.params).toEqual({
        command: "ls -la",
        requiresApproval: true,
      });
    }
  });

  test("コマンドと承認フラグが指定された場合に正しく解析すること", () => {
    const response =
      "<execute_command><command>echo hello</command><requires_approval>false</requires_approval></execute_command>";
    const result = parseTool(response);

    expect(result.ok).toBe(true);
    if (result.ok) {
      const tool = result.result as Tool;
      expect(tool.type).toBe("execute_command");
      expect(tool.params).toEqual({
        command: "echo hello",
        requiresApproval: false,
      });
    }
  });

  test("コマンドが指定されていない場合にエラーを返すこと", () => {
    const response =
      "<execute_command><requires_approval>true</requires_approval></execute_command>";
    const result = parseTool(response);

    expect(result.ok).toBe(false);
    expect(result.error.message).toContain("Missing command parameter");
  });
});

describe("completeツールの解析", () => {
  test("結果が指定された場合に正しく解析すること", () => {
    const response = "<complete><result>Task completed successfully!</result></complete>";
    const result = parseTool(response);

    expect(result.ok).toBe(true);
    if (result.ok) {
      const tool = result.result as Tool;
      expect(tool.type).toBe("complete");
      expect(tool.params).toEqual({ result: "Task completed successfully!" });
    }
  });

  test("結果が指定されていない場合にエラーを返すこと", () => {
    const response = "<complete></complete>";
    const result = parseTool(response);

    expect(result.ok).toBe(false);
    expect(result.error.message).toContain("Missing result parameter");
  });
});
