# リファクタリング計画

## 目的
- コードの整理と保守性の向上
- 責任の明確な分離
- テスト容易性の向上
- 型安全性の確保
- ドメインモデルの明確化

## 計画

### Phase 0: ドメインモデルの再設計 [進行中]
#### SOLID原則に基づく設計
- [x] 基本インターフェースの設計
  - [x] `Skill` インターフェース
  - [x] `Tool` インターフェース
  - [x] `Agent` インターフェース

#### スキルの実装
- [x] 基本的な型定義
  - [x] `SkillContext`
  - [x] `SkillResult`
  - [x] `SkillConfig`
- [x] チャットスキル
  - [x] `ChatSkill` インターフェース
  - [x] `ChatContext` と `ChatResult`
  - [x] 基本実装
  - [x] Gemini 2.0 Flash への移行
  - [ ] テスト
- [ ] メモリスキル
  - [ ] `MemorySkill` インターフェース
  - [ ] `MemoryContext` と `MemoryResult`
  - [ ] 基本実装
  - [ ] テスト

#### ツールの実装
- [x] 基本的な型定義
  - [x] `Tool` インターフェース
  - [x] `ToolConfig`
  - [x] `ToolResult`
- [ ] Discordツール
  - [ ] `DiscordTool` インターフェース
  - [ ] 基本実装
  - [ ] テスト

#### エージェントの実装
- [x] 基本的な型定義
  - [x] `Agent` インターフェース
  - [x] `AgentConfig`
- [ ] 基本実装
  - [ ] スキル管理
  - [ ] コンテキスト管理
  - [ ] テスト

### Phase 1: DiscordBot のクラスベース実装
[previous Phase 1 content...]

### Phase 2: メモリ管理の抽象化
[previous Phase 2 content...]

### Phase 3: エージェント管理の改善
[previous Phase 3 content...]

### Phase 4: 設定管理の整理
[previous Phase 4 content...]

## ディレクトリ構造（現在）
```
src/
├── features/
│   ├── agent/         # エージェント関連
│   │   └── types.ts
│   ├── skills/        # スキル実装
│   │   ├── types.ts
│   │   └── chat/
│   │       ├── types.ts
│   │       └── ChatSkill.ts
│   └── tools/         # ツール実装
│       └── types.ts
├── lib/               # 共通ユーティリティ
└── mastra/            # Mastra関連の実装
```

## 進捗

### 完了した作業
- ドメインモデルの基本設計
- 基本インターフェースの実装
- チャットスキルの基本実装
- チャットスキルの Gemini 2.0 Flash への移行
  - `@ai-sdk/google` を使用した実装
  - モデルの設定とエージェントの指示を更新
  - 高速で効率的な応答が可能に

### 現在の作業
- Phase 0の実装
  - チャットスキルのテスト
  - メモリスキルの実装
  - Discordツールの実装

### 次のステップ
1. メモリスキルの実装
   - インターフェース設計
   - 基本実装
   - テスト
2. Discordツールの実装
   - インターフェース設計
   - 基本実装
   - テスト
3. エージェントの実装
   - スキル管理機能
   - コンテキスト管理
   - テスト