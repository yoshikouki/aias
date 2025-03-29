export type Success<T> = { ok: true; result: T };
export type Failure<E> = { ok: false; error: E };
export type Result<T, E> = Success<T> | Failure<E>;

/**
 * 成功結果を生成するヘルパー関数
 * @param result 成功時の結果データ
 * @returns Success型のオブジェクト
 */
export function success<T>(result: T): Success<T> {
  return { ok: true, result };
}

export type FailureParams<E extends { message: string }> = E | (E & { error?: unknown });

/**
 * 失敗結果を生成するヘルパー関数
 * @param params エラーパラメータ
 * @returns Failure型のオブジェクト
 */
export function failure<E extends { message: string }>(params: FailureParams<E>): Failure<E> {
  // 通常のエラーの場合（error プロパティがない場合）は早期リターン
  if (!("error" in params) || params.error === undefined) {
    return { ok: false, error: params };
  }

  // error プロパティがある場合の処理
  const errorDetail =
    params.error instanceof Error ? params.error.message : String(params.error);
  // エラー型に合う形で返す
  return {
    ok: false,
    error: {
      ...params,
      message: `${params.message}: ${errorDetail}`,
    },
  };
}
