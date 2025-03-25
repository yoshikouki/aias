import { expect, test } from "vitest";
import type { Failure, Result, Success, ToolError, ToolResult } from "./types";

test("Success型が正しく機能すること", () => {
  const success: Success<number> = { ok: true, result: 42 };
  expect(success.ok).toBe(true);
  expect(success.result).toBe(42);
});

test("Failure型が正しく機能すること", () => {
  const error: ToolError = { message: "エラーが発生しました", code: "TEST_ERROR" };
  const failure: Failure<ToolError> = { ok: false, error };

  expect(failure.ok).toBe(false);
  expect(failure.error).toEqual(error);
});

test("Result型を使って成功時の分岐処理ができること", () => {
  const successResult: Result<string, ToolError> = {
    ok: true,
    result: "成功しました",
  };

  // Result型を使った条件分岐
  let message = "";
  if (successResult.ok) {
    message = successResult.result;
  } else {
    // Using type assertion because TypeScript doesn't recognize this branch is unreachable
    message = (successResult as Failure<ToolError>).error.message;
  }

  expect(message).toBe("成功しました");
});

test("Result型を使って失敗時の分岐処理ができること", () => {
  const errorResult: Result<string, ToolError> = {
    ok: false,
    error: { message: "失敗しました", code: "FAIL" },
  };

  // Result型を使った条件分岐
  let message = "";
  if (errorResult.ok) {
    // Using type assertion because TypeScript doesn't recognize this branch is unreachable
    message = (errorResult as Success<string>).result;
  } else {
    message = errorResult.error.message;
  }

  expect(message).toBe("失敗しました");
});

test("ToolResult型が正しく機能すること", () => {
  // 成功例
  const successToolResult: ToolResult = {
    ok: true,
    result: "ツールが正常に実行されました",
  };

  expect(successToolResult.ok).toBe(true);
  expect(successToolResult.result).toBe("ツールが正常に実行されました");

  // 失敗例
  const failureToolResult: ToolResult = {
    ok: false,
    error: {
      message: "ツールの実行に失敗しました",
      code: "TOOL_ERROR",
    },
  };

  expect(failureToolResult.ok).toBe(false);
  expect(failureToolResult.error.message).toBe("ツールの実行に失敗しました");
  expect(failureToolResult.error.code).toBe("TOOL_ERROR");
});
