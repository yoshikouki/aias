# テスト修正タスク

## 失敗しているテスト

### ✅ 1. InMemoryFSAdapter のディレクトリ読み取り
- `src/lib/fsAdapter.test.ts`
- 問題: `readdir` がサブディレクトリを返していない
- 期待値: `["file1.txt", "file2.txt", "subdir"]`
- 実際: `["file1.txt", "file2.txt"]`
- タスク: InMemoryFSAdapter の readdir 実装を修正してサブディレクトリも返すように変更
- 完了: ファイル名のみを返すように修正し、型エラーを修正

### ✅ 2. CodingAgent のツール実行結果
- `src/features/coding/agent.test.ts`
- 問題: ツール実行結果がメッセージに追加されていない
- タスク: 
  - ツール実行結果のメッセージ追加ロジックを確認
  - メッセージの形式が正しいか確認
  - テストのセットアップを見直し
- 完了: fsAdapter を正しく渡すように修正し、テストのセットアップを修正

### ✅ 3. CodingAgent のタスクループ
- `src/features/coding/agent.test.ts`
- 問題: ツール実行結果が期待通りにメッセージに含まれていない
- タスク:
  - ループ処理のロジックを確認
  - メッセージの追加タイミングを確認
  - テストのセットアップを見直し
- 完了: fsAdapter を正しく渡すように修正し、テストのセットアップを修正

### 4. RateLimit Middleware のリセット
- `src/features/rate-limit/middleware.test.ts`
- 問題: 時間経過後も制限がリセットされていない
- タスク:
  - リセットロジックの確認
  - InMemoryRateLimiter の時間管理を確認
  - テストの時間経過シミュレーションを見直し
- 次のステップ: リセットロジックの実装を確認し、修正を行う

### 5. RateLimiter の期限切れ処理
- `src/features/rate-limit/rate-limit.test.ts`
- 問題: 残りリクエスト数の計算が誤っている
- 期待値: 14
- 実際: 1
- タスク:
  - 期限切れリクエストの削除ロジックを確認
  - 残りリクエスト数の計算ロジックを修正
- 次のステップ: 期限切れリクエストの削除と残りリクエスト数の計算ロジックを修正

### ✅ 6. ツールパーサーの read_file 処理
- `src/features/tools/parser.test.ts`
- 問題: read_file ツールのパース結果が失敗している
- タスク:
  - パーサーの実装を確認
  - read_file ツールの入力形式を確認
  - エラーハンドリングを見直し
- 完了: logger を正しく渡すように修正

## 修正の優先順位

1. ✅ InMemoryFSAdapter（基盤機能）
2. ✅ CodingAgent のメッセージ処理（コア機能）
3. 🔄 RateLimit 関連の問題（システム全体に影響）
4. ✅ ツールパーサーの問題（機能拡張に影響）

## 注意点

- 各修正後は全テストを実行して副作用がないことを確認
- テストケースの期待値が正しいことを確認してから実装を修正
- モックを使用せずインメモリ実装でテストする方針を維持 