import { afterEach, describe, expect, it, vi } from "vitest";
import { createPausableTimer } from "@/components/ui/pausable-timer";

describe("createPausableTimer", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("runs after the configured duration", () => {
    vi.useFakeTimers();
    const callback = vi.fn();

    const timer = createPausableTimer(callback, 4000);
    vi.advanceTimersByTime(4000);
    timer.resume();
    vi.runAllTimers();

    expect(callback).toHaveBeenCalledOnce();
  });

  it("keeps the remaining duration while paused", () => {
    vi.useFakeTimers();
    const callback = vi.fn();
    const timer = createPausableTimer(callback, 4000);

    vi.advanceTimersByTime(1500);
    timer.pause();
    vi.advanceTimersByTime(5000);

    expect(callback).not.toHaveBeenCalled();

    timer.resume();
    vi.advanceTimersByTime(2499);
    expect(callback).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(callback).toHaveBeenCalledOnce();
  });

  it("does not run after cancellation", () => {
    vi.useFakeTimers();
    const callback = vi.fn();
    const timer = createPausableTimer(callback, 4000);

    timer.cancel();
    vi.runAllTimers();

    expect(callback).not.toHaveBeenCalled();
  });
});
