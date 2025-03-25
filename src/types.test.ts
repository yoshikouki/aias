import { expect, test } from "vitest";
import { failure, success } from "./lib/result";
import type { Failure, Result, Success, ToolError, ToolResult } from "./types";

test("Success型が正しく機能すること", () => {
  const successObj = success<number>(42);
  expect(successObj.ok).toBe(true);
  expect(successObj.result).toBe(42);
});

test("Failure型が正しく機能すること", () => {
  const error: ToolError = { message: "エラーが発生しました", code: "TEST_ERROR" };
  const failureObj = failure(error);

  expect(failureObj.ok).toBe(false);
  expect(failureObj.error).toEqual(error);
});

test("Result型を使って成功時の分岐処理ができること", () => {
  const successResult: Result<string, ToolError> = success("成功しました");

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
  const errorResult: Result<string, ToolError> = failure({
    message: "失敗しました",
    code: "FAIL",
  });

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
  const successToolResult: ToolResult = success("ツールが正常に実行されました");

  expect(successToolResult.ok).toBe(true);
  expect(successToolResult.result).toBe("ツールが正常に実行されました");

  // 失敗例
  const failureToolResult: ToolResult = failure({
    message: "ツールの実行に失敗しました",
    code: "TOOL_ERROR",
  });

  expect(failureToolResult.ok).toBe(false);
  expect(failureToolResult.error.message).toBe("ツールの実行に失敗しました");
  expect(failureToolResult.error.code).toBe("TOOL_ERROR");
});
