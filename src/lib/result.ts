import type { Failure, Success, ToolError } from "../types";

/**
 * 成功結果を生成するヘルパー関数
 * @param result 成功時の結果データ
 * @returns Success型のオブジェクト
 */
export function success<T>(result: T): Success<T> {
  return { ok: true, result };
}

export type FailureParams =
  | ToolError
  | (ToolError & {
      error?: unknown;
    });

/**
 * 失敗結果を生成するヘルパー関数
 * @param params エラーパラメータ
 * @returns Failure型のオブジェクト
 */
export function failure(params: FailureParams): Failure<ToolError> {
  // 通常のToolErrorの場合（error プロパティがない場合）は早期リターン
  if (!("error" in params) || params.error === undefined) {
    return { ok: false, error: params };
  }

  // error プロパティがある場合の処理
  const errorDetail =
    params.error instanceof Error ? params.error.message : String(params.error);
  // ToolError型に合う形で返す
  return {
    ok: false,
    error: {
      message: `${params.message}: ${errorDetail}`,
      code: params.code,
    },
  };
}
