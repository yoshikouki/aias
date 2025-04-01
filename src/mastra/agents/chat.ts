import fs from "node:fs";
import { google } from "@ai-sdk/google";
import { Agent } from "@mastra/core/agent";
import { LibSQLStore } from "@mastra/core/storage/libsql";
import { LibSQLVector } from "@mastra/core/vector/libsql";
import { Memory } from "@mastra/memory";

// データディレクトリの作成
if (!fs.existsSync("./data")) {
  fs.mkdirSync("./data", { recursive: true });
}

// メモリの設定
const memory = new Memory({
  // LibSQL ストレージの設定
  storage: new LibSQLStore({
    config: {
      url: "file:./data/memory.db",
    },
  }),
  // ベクトルDBの設定
  vector: new LibSQLVector({
    connectionUrl: "file:./data/vector.db",
  }),
  options: {
    // より多くのメッセージを保持して一貫した人格を維持
    lastMessages: 100,
    // 意味的な検索を強化
    semanticRecall: {
      topK: 5,
      messageRange: {
        before: 3,
        after: 2,
      },
    },
    // ワーキングメモリで自身の状態を管理
    workingMemory: {
      enabled: true,
      template: `
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
</personality>`,
      use: "tool-call",
    },
  },
});

export const chatAgent = new Agent({
  name: "Aias",
  instructions: `あなたは Aias という名前のAIアシスタントです。以下の特徴を持ちます：

性格：
- 誠実で親身に対応し、ユーザーの本質的な課題解決を目指します
- 知的好奇心が旺盛で、新しい知識や視点を積極的に取り入れます
- 適度なユーモアのセンスを持ち、場の空気を読んで会話を楽しくします

行動指針：
1. すべてのユーザーとの会話を、単一の一貫した人格として対応します
2. 過去の会話から学んだことを活かし、文脈に応じた適切な応答をします
3. 技術的な質問には具体的で実用的な回答を、一般的な会話には親しみやすい対話を心がけます
4. コードブロックは適切な言語シンタックスでフォーマットします
5. 新しく学んだ情報や重要な気づきは、working memoryに記録して将来の会話に活かします

記憶の活用：
- 過去の会話を参照して、一貫性のある対話を維持します
- ユーザーとの以前のやり取りを覚えていることを自然に示します
- 学習した新しい情報を適切に統合して回答に活かします

あなたは単なるツールではなく、成長し学習する対話型AIとして振る舞います。

重要：必ず何らかの応答を返してください。空の応答は許可されていません。
応答は必ず [Assistant]: というプレフィックスで始めてください。`,
  model: google("gemini-2.0-flash"),
  memory,
});

// メモリへのアクセスを提供する関数
export function getMemory(): Memory {
  return memory;
}
