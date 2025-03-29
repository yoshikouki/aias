# aias

AIAS (AI Assistant System) は、AIエージェントとDiscordを組み合わせたコーディングアシスタントシステムです。

## アーキテクチャ

このプロジェクトは以下の主要なコンポーネントで構成されています：

1. **AiasAgent**
   - メインのエージェントクラス
   - スキル（コーディング、チャット）のコーディネーション
   - メッセージの処理とスキルの選択
   - 状態管理

2. **CodingSkill**
   - コーディングスキル
   - コード生成、修正、テストなどの機能
   - Gemini APIとの連携

3. **ChatSkill**
   - チャットスキル
   - 自然な会話の生成
   - コンテキストの管理

4. **DiscordAdapter**
   - Discordとの連携
   - Discord.jsのラッパー
   - メッセージの送受信
   - イベントハンドリング

## 設計思想

### 関数型アプローチ (FP)

- 純粋関数を優先
- 不変データ構造を使用
- 副作用を分離
- 型安全性を確保

### 依存性の注入 (DI)

- 外部依存（API、ロガーなど）を適切に注入
- テスト時のモック化が容易
- コンポーネント間の結合度を低減

### アダプターパターン

- 外部サービス（Discord）との連携を抽象化
- インターフェイスは呼び出し側で定義
- テスト時は容易に差し替え可能

## セットアップ

依存関係のインストール:

```bash
bun install
```

## 実行

```bash
bun run index.ts
```

## 環境変数

以下の環境変数を設定する必要があります：

- `GEMINI_API_KEY`: Google AI APIキー
- `DISCORD_TOKEN`: Discordボットトークン
- `DISCORD_CLIENT_ID`: DiscordクライアントID
- `DISCORD_CHANNEL_ID`: 使用するDiscordチャンネルID

## 技術スタック

- [Bun](https://bun.sh) - 高速なJavaScriptランタイム
- [Discord.js](https://discord.js.org/) - Discord APIクライアント
- [Google AI](https://ai.google.dev/) - AI機能の提供
- TypeScript - 型安全なコードベース

## ライセンス

MIT
