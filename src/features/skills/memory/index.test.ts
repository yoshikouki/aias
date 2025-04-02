import { expect, test } from "vitest";
import { DefaultMemorySkill } from "./index";
import type {
  MemoryAdapter,
  MemoryContext,
  Message,
  StorageMessage,
  StorageThread,
} from "./types";

// --- Test Setup ---

const TEST_THREAD_ID = "test-thread-1";
const TEST_RESOURCE_ID = "test-resource-1";

// --- Test Cases ---

test("getThreadById should return thread data when thread exists", async () => {
  // Arrange (準備)
  const mockThread: StorageThread = {
    id: TEST_THREAD_ID,
    resourceId: TEST_RESOURCE_ID,
    title: "Test Thread Title",
    messages: [
      { id: "msg1", role: "user", content: "Hello", createdAt: new Date() },
      { id: "msg2", role: "assistant", content: "Hi there!", createdAt: new Date() },
      { id: "msg3", role: "system", content: "System init", createdAt: new Date() }, // systemはフィルタされるはず
    ],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  // MemoryAdapterのモック実装
  const mockMemoryAdapter: MemoryAdapter = {
    getThreadById: async ({ threadId }) => {
      if (threadId === TEST_THREAD_ID) {
        return mockThread;
      }
      return null;
    },
    createThread: async () => {},
    query: async () => ({ messages: [] }),
    addMessage: async () => {},
  };

  const memorySkill = new DefaultMemorySkill({ memory: mockMemoryAdapter });

  // Act (実行)
  const result = await memorySkill.getThreadById({ threadId: TEST_THREAD_ID });

  // Assert (検証)
  expect(result).not.toBeNull();
  expect(result?.threadId).toBe(TEST_THREAD_ID);
  expect(result?.resourceId).toBe(TEST_RESOURCE_ID);
  expect(result?.title).toBe("Test Thread Title");
  expect(result?.messages).toHaveLength(2); // system メッセージは除外される
  expect(result?.messages[0]?.role).toBe("user");
  expect(result?.messages[0]?.content).toBe("Hello");
  expect(result?.messages[1]?.role).toBe("assistant");
  expect(result?.messages[1]?.content).toBe("Hi there!");
});

test("getThreadById should return null when thread does not exist", async () => {
  // Arrange (準備)
  const mockMemoryAdapter: MemoryAdapter = {
    getThreadById: async ({ threadId: _ }) => {
      // Simulate thread not found for any ID in this mock
      return null;
    },
    createThread: async () => {},
    query: async () => ({ messages: [] }),
    addMessage: async () => {},
  };

  const memorySkill = new DefaultMemorySkill({ memory: mockMemoryAdapter });
  const nonExistentThreadId = "non-existent-thread";

  // Act (実行)
  const result = await memorySkill.getThreadById({ threadId: nonExistentThreadId });

  // Assert (検証)
  expect(result).toBeNull();
});

test("getThreadById should return null when adapter throws an error", async () => {
  // Arrange (準備)
  const errorMessage = "Database connection failed";
  const mockMemoryAdapter: MemoryAdapter = {
    getThreadById: async ({ threadId: _ }) => {
      throw new Error(errorMessage);
    },
    createThread: async () => {},
    query: async () => ({ messages: [] }),
    addMessage: async () => {},
  };

  const memorySkill = new DefaultMemorySkill({ memory: mockMemoryAdapter });

  // Act (実行) & Assert (検証)
  // Expect the method to reject with the specific error
  await expect(memorySkill.getThreadById({ threadId: TEST_THREAD_ID })).rejects.toThrowError(
    errorMessage,
  );
});

// --- createThread Tests ---

test("createThread should call adapter.createThread with correct arguments", async () => {
  // Arrange (準備)
  let calledWith: Parameters<MemoryAdapter["createThread"]>[0] | null = null;
  const mockMemoryAdapter: MemoryAdapter = {
    getThreadById: async () => null,
    createThread: async (params) => {
      calledWith = params;
    },
    query: async () => ({ messages: [] }),
    addMessage: async () => {},
  };

  const memorySkill = new DefaultMemorySkill({ memory: mockMemoryAdapter });
  const newThreadParams = {
    threadId: "new-thread-id",
    resourceId: "new-resource-id",
    title: "New Thread Title",
  };

  // Act (実行)
  await memorySkill.createThread(newThreadParams);

  // Assert (検証)
  expect(calledWith).toEqual(newThreadParams);
});

// TODO: Add test cases for createThread error handling (if necessary)

// --- addMessage Tests ---

test("addMessage should call adapter.addMessage with correct arguments for user message", async () => {
  // Arrange
  let calledWith: Parameters<MemoryAdapter["addMessage"]>[0] | null = null;
  const mockMemoryAdapter: MemoryAdapter = {
    getThreadById: async () => ({}) as StorageThread, // Assume thread exists
    createThread: async () => {},
    query: async () => ({ messages: [] }),
    addMessage: async (params) => {
      calledWith = params;
    },
  };
  const memorySkill = new DefaultMemorySkill({ memory: mockMemoryAdapter });
  const userMessage: Message = {
    role: "user",
    content: "Test user message",
  };
  const expectedAdapterParams = {
    threadId: TEST_THREAD_ID,
    type: "text",
    content: userMessage.content,
    role: userMessage.role,
  };

  // Act
  await memorySkill.addMessage({ threadId: TEST_THREAD_ID, message: userMessage });

  // Assert
  expect(calledWith).toEqual(expectedAdapterParams);
});

test("addMessage should not call adapter.addMessage for system message", async () => {
  // Arrange
  let adapterCalled = false;
  const mockMemoryAdapter: MemoryAdapter = {
    getThreadById: async () => ({}) as StorageThread,
    createThread: async () => {},
    query: async () => ({ messages: [] }),
    addMessage: async (_params) => {
      adapterCalled = true;
    },
  };
  const memorySkill = new DefaultMemorySkill({ memory: mockMemoryAdapter });
  const systemMessage: Message = {
    role: "system",
    content: "Test system message",
  };

  // Act
  await memorySkill.addMessage({ threadId: TEST_THREAD_ID, message: systemMessage });

  // Assert
  expect(adapterCalled).toBe(false);
});

// --- execute/use Tests ---

test("execute should create thread if it does not exist and return success", async () => {
  // Arrange
  let createThreadCalled = false;
  let getThreadByIdCounter = 0;
  const mockMemoryAdapter: MemoryAdapter = {
    getThreadById: async ({ threadId }) => {
      getThreadByIdCounter++;
      // Initially return null (thread not found), then return a dummy thread
      return getThreadByIdCounter <= 1
        ? null
        : {
            id: threadId,
            resourceId: TEST_RESOURCE_ID,
            messages: [],
            createdAt: new Date(),
            updatedAt: new Date(),
          };
    },
    createThread: async (_params) => {
      createThreadCalled = true;
    },
    query: async () => ({ messages: [] }),
    addMessage: async () => {},
  };
  const memorySkill = new DefaultMemorySkill({ memory: mockMemoryAdapter });
  const context: MemoryContext = {
    threadId: "new-exec-thread",
    resourceId: TEST_RESOURCE_ID,
    timestamp: Date.now(),
    // No options specified initially
  };

  // Act
  const result = await memorySkill.execute(context);

  // Assert
  expect(result.success).toBe(true);
  expect(createThreadCalled).toBe(true);
  expect(getThreadByIdCounter).toBeGreaterThanOrEqual(1); // Called at least once
  expect(result.data?.threadId).toBe(context.threadId);
  expect(result.data?.resourceId).toBe(context.resourceId);
});

test("execute should use existing thread and return success", async () => {
  // Arrange
  let createThreadCalled = false;
  let getThreadByIdCalled = false;
  const existingThread: StorageThread = {
    id: TEST_THREAD_ID,
    resourceId: TEST_RESOURCE_ID,
    messages: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  const mockMemoryAdapter: MemoryAdapter = {
    getThreadById: async ({ threadId }) => {
      getThreadByIdCalled = true;
      return threadId === TEST_THREAD_ID ? existingThread : null;
    },
    createThread: async (_params) => {
      createThreadCalled = true; // Should not be called
    },
    query: async () => ({ messages: [] }),
    addMessage: async () => {},
  };
  const memorySkill = new DefaultMemorySkill({ memory: mockMemoryAdapter });
  const context: MemoryContext = {
    threadId: TEST_THREAD_ID,
    resourceId: TEST_RESOURCE_ID,
    timestamp: Date.now(),
  };

  // Act
  const result = await memorySkill.execute(context);

  // Assert
  expect(result.success).toBe(true);
  expect(createThreadCalled).toBe(false); // Ensure createThread was NOT called
  expect(getThreadByIdCalled).toBe(true);
  expect(result.data?.threadId).toBe(TEST_THREAD_ID);
  expect(result.data?.resourceId).toBe(context.resourceId);
});

test("execute should call query and return relatedMessages when semanticRecall is enabled", async () => {
  // Arrange
  let queryCalledWith: Parameters<MemoryAdapter["query"]>[0] | null = null;
  const relatedStorageMessages: StorageMessage[] = [
    { id: "rel1", role: "user", content: "Related message 1", createdAt: new Date() },
    { id: "rel2", role: "assistant", content: "Related response", createdAt: new Date() },
  ];
  const existingThread: StorageThread = {
    id: TEST_THREAD_ID,
    resourceId: TEST_RESOURCE_ID,
    messages: [], // Main messages aren't relevant for this specific test part
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  const mockMemoryAdapter: MemoryAdapter = {
    getThreadById: async () => existingThread, // Assume thread exists
    createThread: async () => {},
    query: async (params) => {
      queryCalledWith = params;
      return { messages: relatedStorageMessages };
    },
    addMessage: async () => {},
  };
  const memorySkill = new DefaultMemorySkill({ memory: mockMemoryAdapter });
  const context: MemoryContext = {
    threadId: TEST_THREAD_ID,
    resourceId: TEST_RESOURCE_ID,
    timestamp: Date.now(),
    options: {
      semanticRecall: {
        topK: 2, // Example value
      },
    },
  };

  // Act
  const result = await memorySkill.execute(context);

  // Assert
  expect(result.success).toBe(true);
  expect(queryCalledWith).toEqual({ threadId: TEST_THREAD_ID, selectBy: { last: 2 } });
  expect(result.data?.relatedMessages).toBeDefined();
  expect(result.data?.relatedMessages).toHaveLength(2);
  expect(result.data?.relatedMessages?.[0]?.content).toBe("Related message 1");
  expect(result.data?.relatedMessages?.[1]?.content).toBe("Related response");
});

test("execute should return success: false when getThreadById fails", async () => {
  // Arrange
  const errorMessage = "Failed to get thread";
  const mockMemoryAdapter: MemoryAdapter = {
    getThreadById: async ({ threadId: _ }) => {
      throw new Error(errorMessage);
    },
    createThread: async () => {},
    query: async () => ({ messages: [] }),
    addMessage: async () => {},
  };
  const memorySkill = new DefaultMemorySkill({ memory: mockMemoryAdapter });
  const context: MemoryContext = {
    threadId: TEST_THREAD_ID,
    resourceId: TEST_RESOURCE_ID,
    timestamp: Date.now(),
  };

  // Act
  const result = await memorySkill.execute(context);

  // Assert
  expect(result.success).toBe(false);
  expect(result.error).toBeInstanceOf(Error);
  expect(result.error?.message).toBe(errorMessage);
});

// TODO: Add more test cases for execute/use (e.g., query error)
