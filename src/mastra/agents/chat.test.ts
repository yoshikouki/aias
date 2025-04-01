import type { Memory } from "@mastra/memory";
import { beforeAll, beforeEach, expect, test } from "vitest";
import { chatAgent, getMemoryForTesting } from "./chat";

const TEST_THREAD_ID = "test-thread";
const TEST_RESOURCE_ID = "test-user";
let memory: Memory;

beforeAll(() => {
  // テスト環境設定
  process.env.NODE_ENV = "test";
});

beforeEach(async () => {
  try {
    memory = getMemoryForTesting();
  } catch (error) {
    throw new Error("Failed to initialize memory for testing");
  }

  // テスト用スレッドの作成
  await memory.createThread({
    threadId: TEST_THREAD_ID,
    resourceId: TEST_RESOURCE_ID,
    title: "Test Conversation",
  });
});

test("チャットエージェントの基本設定", () => {
  expect(chatAgent.name).toBe("Aias");
  expect(memory).toBeDefined();
});

test("メッセージのスレッド管理", async () => {
  const thread = await memory.getThreadById({
    threadId: TEST_THREAD_ID,
  });

  expect(thread).toBeDefined();
  expect(thread?.id).toBe(TEST_THREAD_ID);
  expect(thread?.resourceId).toBe(TEST_RESOURCE_ID);
});

test("会話履歴の取得", async () => {
  const result = await memory.query({
    threadId: TEST_THREAD_ID,
    selectBy: {
      last: 10,
    },
  });

  expect(result).toBeDefined();
  expect(Array.isArray(result.messages)).toBe(true);
});

test("ワーキングメモリの状態確認", async () => {
  const workingMemory = await memory.getWorkingMemory({
    threadId: TEST_THREAD_ID,
  });

  expect(workingMemory).toBeDefined();
  expect(workingMemory).toContain("<personality>");
  expect(workingMemory).toContain("<name>Aias</name>");
});

test("複数スレッドの管理", async () => {
  // 新しいスレッドの作成
  const newThreadId = "test-thread-2";
  const thread = await memory.createThread({
    threadId: newThreadId,
    resourceId: TEST_RESOURCE_ID,
    title: "New Conversation",
  });

  expect(thread).toBeDefined();
  expect(thread.id).toBe(newThreadId);

  // スレッドの取得
  const retrieved = await memory.getThreadById({
    threadId: newThreadId,
  });

  expect(retrieved).toBeDefined();
  expect(retrieved?.id).toBe(newThreadId);
  expect(retrieved?.title).toBe("New Conversation");
});

test("メモリシステムの統合テスト", async () => {
  // 1. スレッド作成
  const threadId = "integration-test";
  await memory.createThread({
    threadId,
    resourceId: TEST_RESOURCE_ID,
    title: "Integration Test",
  });

  // 2. メッセージの履歴確認
  const history = await memory.query({
    threadId,
    selectBy: { last: 1 },
  });
  expect(history).toBeDefined();

  // 3. ワーキングメモリ確認
  const workingMemory = await memory.getWorkingMemory({
    threadId,
  });
  expect(workingMemory).toBeDefined();
});
