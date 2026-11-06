import { describe, expect, it, vi } from "vitest";
import { createBffSessionReader } from "../api/bff-session-reader";
import { authenticatedSnapshot } from "../api/__fixtures__/bff-session";
import { createLatestOperationTracker } from "./latest-operation";

describe("session hydration with the existing operation tracker", () => {
  it.each([200, 401, 503])("does not let a pending HTTP %s read replace a newer session operation", async (status) => {
    const tracker = createLatestOperationTracker();
    const first = tracker.start();
    const response = status === 200 ? authenticatedSnapshot()
      : status === 401 ? { status: "anonymous", clearCookie: true } : { status: "unavailable" };
    let finish!: (response: Response) => void;
    const fetcher = vi.fn<typeof fetch>(() => new Promise((resolve) => { finish = resolve; }));
    const pending = createBffSessionReader(fetcher).read({ isCurrent: first.isCurrent });
    const next = tracker.start();
    const commit = vi.fn();
    expect(next.commit(commit)).toBe(true);
    finish(Response.json(response, { status }));
    expect(await pending).toEqual({ status: "stale" });
    expect(first.commit(commit)).toBe(false);
    expect(commit).toHaveBeenCalledOnce();
  });

  it("allows the current read to commit without retaining previous account data", async () => {
    const tracker = createLatestOperationTracker();
    const current = tracker.start();
    const result = await createBffSessionReader(async () => Response.json(authenticatedSnapshot()))
      .read({ isCurrent: current.isCurrent });
    const commit = vi.fn();
    expect(result.status).toBe("authenticated");
    expect(current.commit(() => commit(result))).toBe(true);
    expect(commit).toHaveBeenCalledOnce();
  });
});
