// One editor may save OR unlink at a time. Invalidating drops late UI callbacks,
// but does not claim to cancel a request already accepted by the repository.
export function createEmployeeMutationTracker() {
  let generation = 0;
  let busy = false;
  return {
    invalidate() {
      generation++;
      busy = false;
    },
    start() {
      if (busy) return null;
      busy = true;
      const current = ++generation;
      let finished = false;
      return {
        isCurrent: () => generation === current,
        finish() {
          if (finished || generation !== current) return false;
          finished = true;
          busy = false;
          return true;
        },
      };
    },
  };
}
