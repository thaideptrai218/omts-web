export type OperationHandle = Readonly<{
  isCurrent(): boolean;
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
      const isCurrent = () => operationId === latestOperationId;

      return {
        isCurrent,
        commit(action) {
          if (!isCurrent()) return false;

          action();
          return true;
        },
      };
    },
  };
}
