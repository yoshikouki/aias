export class AsyncLock {
  private locks: Map<string, Promise<void>> = new Map();
  private lockResolvers: Map<string, () => void> = new Map();

  async acquire<T>(key: string, fn: () => Promise<T>): Promise<T> {
    // 既存のロックがある場合は待機
    if (this.locks.has(key)) {
      await this.locks.get(key);
    }

    // 新しいロックを作成
    const lockPromise = new Promise<void>((resolve) => {
      this.lockResolvers.set(key, resolve);
    });
    this.locks.set(key, lockPromise);

    try {
      // 関数を実行
      return await fn();
    } finally {
      // ロックを解放
      this.locks.delete(key);
      const resolver = this.lockResolvers.get(key);
      if (resolver) {
        this.lockResolvers.delete(key);
        resolver();
      }
    }
  }
}
