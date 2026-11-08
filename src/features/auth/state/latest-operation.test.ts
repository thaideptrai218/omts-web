import { describe, expect, it, vi } from "vitest";
import { createLatestOperationTracker } from "@/features/auth/state/latest-operation";

describe("createLatestOperationTracker", () => {
  it("allows the latest operation to commit", () => {
    const tracker = createLatestOperationTracker();
    const action = vi.fn();

    const operation = tracker.start();

    expect(operation.commit(action)).toBe(true);
    expect(action).toHaveBeenCalledOnce();
  });

  it("prevents an older operation from committing after a newer one starts", () => {
    const tracker = createLatestOperationTracker();
    const staleBootstrapCommit = vi.fn();
    const loginCommit = vi.fn();

    const bootstrap = tracker.start();
    const login = tracker.start();

    expect(login.commit(loginCommit)).toBe(true);
    expect(bootstrap.commit(staleBootstrapCommit)).toBe(false);
    expect(loginCommit).toHaveBeenCalledOnce();
    expect(staleBootstrapCommit).not.toHaveBeenCalled();
  });
});
