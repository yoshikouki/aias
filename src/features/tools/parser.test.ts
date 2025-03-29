import { describe, expect, test } from "vitest";
import { parseAndExecuteTool } from "./parser";

describe("parseAndExecuteTool", () => {
  test("空の文字列を渡すとエラーを返すこと", async () => {
    const result = await parseAndExecuteTool("");
    expect(result.toolResult.ok).toBe(false);
    if (!result.toolResult.ok) {
      expect(result.toolResult.error.code).toBe("PARSE_ERROR");
    }
  });

  test("不正なXMLを渡すとエラーを返すこと", async () => {
    const result = await parseAndExecuteTool("<invalid>");
    expect(result.toolResult.ok).toBe(false);
    if (!result.toolResult.ok) {
      expect(result.toolResult.error.code).toBe("PARSE_ERROR");
    }
  });

  test("未知のツールを渡すとエラーを返すこと", async () => {
    const result = await parseAndExecuteTool("<unknown_tool></unknown_tool>");
    expect(result.toolResult.ok).toBe(false);
    if (!result.toolResult.ok) {
      expect(result.toolResult.error.code).toBe("UNKNOWN_TOOL");
    }
  });

  test("list_fileツールを正しくパースできること", async () => {
    const result = await parseAndExecuteTool(
      "<list_file><path>test</path><recursive>true</recursive></list_file>",
    );
    expect(result.toolResult.ok).toBe(true);
    if (result.toolResult.ok) {
      expect(result.toolResult.result).toBeDefined();
    }
  });

  test("read_fileツールを正しくパースできること", async () => {
    const result = await parseAndExecuteTool("<read_file><path>test.txt</path></read_file>");
    expect(result.toolResult.ok).toBe(true);
    if (result.toolResult.ok) {
      expect(result.toolResult.result).toBeDefined();
    }
  });

  test("write_fileツールを正しくパースできること", async () => {
    const result = await parseAndExecuteTool(
      "<write_file><path>test.txt</path><content>test content</content></write_file>",
    );
    expect(result.toolResult.ok).toBe(true);
    if (result.toolResult.ok) {
      expect(result.toolResult.result).toBeDefined();
    }
  });

  test("completeツールを正しくパースできること", async () => {
    const result = await parseAndExecuteTool("<complete><r>タスク完了</r></complete>");
    expect(result.toolResult.ok).toBe(true);
    if (result.toolResult.ok) {
      expect(result.toolResult.result).toBeDefined();
    }
  });
});
