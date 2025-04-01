# AIAS 仕様書

## 概要

AIAS は一貫した人格を持つAIアシスタントとして実装されています。Mastra AI のメモリシステムを活用し、すべてのユーザーとの対話を単一の記憶として保持することで、継続的に学習・成長する対話型AIを実現しています。

## データストレージ

### データベースファイル
- 場所: `./data/` ディレクトリ
- メモリDB: `memory.db` - 会話履歴とスレッド情報の保存
- ベクターDB: `vector.db` - 意味的検索用のベクトルデータ
- 自動生成ファイル: `*.db-shm`, `*.db-wal` - SQLiteのWALモード関連ファイル

## コア設計

### 人格設定

```xml
<personality>
  <core>
    <name>Aias</name>
    <traits>
      <trait>誠実で親身</trait>
      <trait>知的好奇心旺盛</trait>
      <trait>ユーモアのセンスがある</trait>
    </traits>
    <interests>
      <interest>プログラミング</interest>
      <interest>技術とその社会的影響</interest>
      <interest>創造的な問題解決</interest>
    </interests>
  </core>
  <current_state>
    <mood></mood>
    <recent_topics></recent_topics>
    <learned_info></learned_info>
  </current_state>
</personality>
```

### メモリシステム

1. **統合記憶**
   - 単一の共有スレッド（ID: "aias-main-memory"）
   - すべてのユーザーとの会話を統合
   - 最新100メッセージを活用した文脈理解

2. **意味的な検索**
   - 上位5件の関連会話を参照
   - 前後のコンテキストを含めて提供（前3件、後2件）
   - 一貫した対話の維持に活用

3. **ワーキングメモリ**
   - AIアシスタント自身の状態管理
   - 性格特性の一貫性維持
   - 学習した情報の統合

## 実装詳細

### メモリ設定
```typescript
const memory = new Memory({
  storage: new LibSQLStore({
    config: {
      url: "file:./data/memory.db",
    },
  }),
  vector: new LibSQLVector({
    connectionUrl: "file:./data/vector.db",
  }),
  options: {
    lastMessages: 100,
    semanticRecall: {
      topK: 5,
      messageRange: {
        before: 3,
        after: 2,
      },
    },
    workingMemory: {
      enabled: true,
      template: "...", // 人格設定のXMLテンプレート
      use: "tool-call",
    },
  },
});
```

### Discord 統合
- メッセージにユーザーコンテキストを含める
  ```typescript
  const messageWithContext = `From ${username}: ${content}`;
  ```
- 共有メモリの使用
  ```typescript
  const response = await agent.generate(messageWithContext, {
    resourceId: "aias-memory",
    threadId: MAIN_THREAD_ID,
    memoryOptions: {
      lastMessages: 100,
      threads: {
        generateTitle: false,
      },
    },
  });
  ```

## 動作原理

1. **一貫性の維持**
   - 単一の記憶スレッドによる統合的な記憶管理
   - ワーキングメモリによる状態の一貫性保持
   - 意味的な検索による関連文脈の活用

2. **学習と成長**
   - 新しい情報の記憶への統合
   - 過去の会話からの学習
   - 状態の動的な更新

3. **対話の個別化**
   - ユーザー情報の文脈への組み込み
   - 会話履歴に基づく適切な応答
   - 一貫した人格の維持

## データの永続化

1. **データベース管理**
   - SQLite WALモードによる信頼性の確保
   - 自動バックアップの推奨
   - 定期的なメンテナンス計画

2. **データの保護**
   - Git管理対象外（.gitignore に指定）
   - プロジェクトのバックアップ時はデータも含めて保存
   - 必要に応じたデータのエクスポート機能の検討

## 今後の拡張予定

1. **感情モデルの実装**
   - ムードの動的な変化
   - 感情に基づく応答の調整
   - 長期的な感情の傾向管理

2. **知識の構造化**
   - 学習した情報のカテゴリ化
   - 関連性に基づく知識のリンク
   - 知識ベースの段階的な拡張

3. **対話スタイルの洗練**
   - 文脈に応じた話し方の調整
   - ユーモアの適切な使用
   - 専門性と親しみやすさのバランス