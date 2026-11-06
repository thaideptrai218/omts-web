export type PausableTimer = Readonly<{
  cancel(): void;
  pause(): void;
  resume(): void;
}>;

export function createPausableTimer(
  callback: () => void,
  durationMs: number,
): PausableTimer {
  let remainingMs = Math.max(0, durationMs);
  let startedAt = 0;
  let timeoutId: ReturnType<typeof globalThis.setTimeout> | undefined;
  let isCancelled = false;

  function schedule() {
    if (isCancelled || timeoutId !== undefined) return;

    startedAt = Date.now();
    timeoutId = globalThis.setTimeout(() => {
      timeoutId = undefined;
      isCancelled = true;
      callback();
    }, remainingMs);
  }

  schedule();

  return {
    cancel() {
      isCancelled = true;
      if (timeoutId !== undefined) globalThis.clearTimeout(timeoutId);
      timeoutId = undefined;
    },
    pause() {
      if (timeoutId === undefined) return;

      globalThis.clearTimeout(timeoutId);
      timeoutId = undefined;
      remainingMs = Math.max(0, remainingMs - (Date.now() - startedAt));
    },
    resume() {
      schedule();
    },
  };
}
