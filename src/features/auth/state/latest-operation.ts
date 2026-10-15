export type OperationHandle = Readonly<{
  commit(action: () => void): boolean;
}>;

export type LatestOperationTracker = Readonly<{
  start(): OperationHandle;
}>;

export function createLatestOperationTracker(): LatestOperationTracker {
  let latestOperationId = 0;

  return {
    start() {
      const operationId = ++latestOperationId;

      return {
        commit(action) {
          if (operationId !== latestOperationId) return false;

          action();
          return true;
        },
      };
    },
  };
}
