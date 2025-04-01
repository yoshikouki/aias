# AIAS

AIAS は一貫した人格を持つAIアシスタントとして実装されています。Mastra AI のメモリシステムを活用し、すべてのユーザーとの対話を単一の記憶として保持することで、継続的に学習・成長する対話型AIを実現しています。

## アーキテクチャ

AIAS は SOLID 原則に基づいて設計された、スキルベースのアーキテクチャを採用しています。

### コアコンセプト

#### エージェント (Agent)
エージェントは複数のスキルを組み合わせて動作する中心的な存在です。
- スキルのオーケストレーション
- コンテキストの管理
- 一貫した人格の維持

```typescript
interface Agent {
  readonly id: string;
  readonly skills: ReadonlyMap<string, Skill<any, any>>;
  useSkill<T extends Skill<any, any>>(
    skillType: string,
    context: Parameters<T["use"]>[0]
  ): Promise<ReturnType<T["use"]>>;
}
```

#### スキル (Skill)
スキルは特定の能力を表現する単位です。
- 単一責任の原則に基づく設計
- 独立した機能単位
- 組み合わせ可能な設計

```typescript
interface Skill<Context, Result> {
  readonly type: string;
  use(context: Context): Promise<Result>;
}

// 例: チャットスキル
interface ChatSkill extends Skill<ChatContext, ChatResult> {
  type: "chat";
  // チャット特有の機能
}

// 例: メモリスキル
interface MemorySkill extends Skill<MemoryContext, MemoryResult> {
  type: "memory";
  // メモリ特有の機能
}
```

#### ツール (Tool)
ツールはスキルを実行するための具体的な手段を提供します。
- 外部システムとの統合
- プラットフォーム特有の実装
- スキルとの疎結合

```typescript
interface Tool<S extends Skill<any, any>> {
  readonly type: string;
  execute(skill: S, context: Parameters<S["use"]>[0]): Promise<void>;
}

// 例: Discordツール
interface DiscordTool extends Tool<ChatSkill> {
  type: "discord";
  // Discord特有の実装
}
```

### 設計原則

#### 1. Single Responsibility Principle
各コンポーネントは単一の責務を持ちます：
- Skill: 特定の能力の実装
- Tool: 特定のプラットフォームとの統合
- Agent: スキルの調整と管理

#### 2. Open-Closed Principle
拡張に対して開かれ、修正に対して閉じられています：
- 新しいスキルの追加が容易
- 新しいツールの追加が容易
- 既存コードの変更なしで機能拡張が可能

#### 3. Liskov Substitution Principle
基本型は安全に置き換え可能：
- スキルの基本契約の遵守
- ツールの一貫した動作
- 型安全性の確保

#### 4. Interface Segregation Principle
インターフェースは必要最小限に保たれています：
- 役割に応じた分割
- クライアント特化のインターフェース
- 不要な依存の排除

#### 5. Dependency Inversion Principle
高レベルモジュールは低レベルモジュールに依存しません：
- 抽象への依存
- プラグイン機構
- テスト容易性

## 実装例

```typescript
// エージェントの使用例
const agent = new Agent({
  id: "aias",
  skills: new Map([
    ["chat", new ChatSkill()],
    ["memory", new MemorySkill()]
  ])
});

// スキルの使用
const result = await agent.useSkill<ChatSkill>("chat", {
  message: "こんにちは",
  context: { /* ... */ }
});

// ツールによるスキルの実行
const discordTool = new DiscordTool(client, logger);
await discordTool.execute(chatSkill, chatContext);
```

## 開発環境

```bash
# 依存関係のインストール
bun install

# 静的型チェック
bun run format
bun run test:build
bun run knip:fix

# テストの実行
bun run test

# ビルド
bun run build
```

## ライセンス

[MIT License](LICENSE)