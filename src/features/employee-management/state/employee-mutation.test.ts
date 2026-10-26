import { describe, expect, it } from "vitest";
import { createEmployeeMutationTracker } from "./employee-mutation";

describe("employee editor mutation ownership", () => {
  it("blocks a second save or unlink synchronously", () => {
    const tracker = createEmployeeMutationTracker();
    const first = tracker.start()!;
    expect(tracker.start()).toBeNull();
    expect(first.finish()).toBe(true);
    expect(first.finish()).toBe(false);
    const second = tracker.start()!;
    expect(first.isCurrent()).toBe(false);
    expect(first.finish()).toBe(false);
    expect(tracker.start()).toBeNull();
    expect(second.finish()).toBe(true);
  });

  it("drops responses after unmount without releasing a newer request", () => {
    const tracker = createEmployeeMutationTracker();
    const old = tracker.start()!;
    tracker.invalidate();
    const current = tracker.start()!;
    expect(old.isCurrent()).toBe(false);
    expect(old.finish()).toBe(false);
    expect(current.isCurrent()).toBe(true);
    expect(tracker.start()).toBeNull();
  });
});
