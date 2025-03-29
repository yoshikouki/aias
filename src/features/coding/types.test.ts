import { describe, expect, test } from "vitest";
import type { ToolError } from "../tools/types";

describe("ToolError", () => {
  test("ToolErrorの型が正しく定義されていること", () => {
    const error: ToolError = {
      code: "READ_FILE_ERROR",
      message: "Failed to read file",
    };
    expect(error).toBeDefined();
    expect(error.code).toBe("READ_FILE_ERROR");
    expect(error.message).toBe("Failed to read file");
  });
});
