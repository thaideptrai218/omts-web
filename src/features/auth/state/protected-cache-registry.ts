export type ProtectedCacheCleanup = () => void;

export type ProtectedCacheCleanupReport = Readonly<{
  attemptedKeys: readonly string[];
  failedKeys: readonly string[];
}>;

export type ProtectedCacheRegistry = Readonly<{
  register(key: string, cleanup: ProtectedCacheCleanup): () => void;
  clearAll(): ProtectedCacheCleanupReport;
}>;

export function createProtectedCacheRegistry(): ProtectedCacheRegistry {
  const cleanups = new Map<string, ProtectedCacheCleanup>();

  return {
    register(key, cleanup) {
      if (cleanups.has(key)) {
        throw new Error(`Protected cache cleanup "${key}" is already registered.`);
      }

      cleanups.set(key, cleanup);

      return () => {
        if (cleanups.get(key) === cleanup) {
          cleanups.delete(key);
        }
      };
    },

    clearAll() {
      const attemptedKeys: string[] = [];
      const failedKeys: string[] = [];

      cleanups.forEach((cleanup, key) => {
        attemptedKeys.push(key);

        try {
          cleanup();
        } catch {
          failedKeys.push(key);
        }
      });

      return { attemptedKeys, failedKeys };
    },
  };
}

export const protectedCacheRegistry = createProtectedCacheRegistry();
