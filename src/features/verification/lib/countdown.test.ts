import { describe, expect, it } from "vitest";

import {
  formatCountdown,
  getRemainingSeconds,
} from "@/features/verification/lib/countdown";

describe("verification countdown", () => {
  it("rounds partial seconds up so an action is not enabled early", () => {
    expect(getRemainingSeconds(60_001, 1)).toBe(60);
    expect(getRemainingSeconds(60_001, 1_002)).toBe(59);
  });

  it("never returns a negative remaining time", () => {
    expect(getRemainingSeconds(1_000, 2_000)).toBe(0);
  });

  it("formats minutes and seconds with two digits", () => {
    expect(formatCountdown(300)).toBe("05:00");
    expect(formatCountdown(9)).toBe("00:09");
    expect(formatCountdown(-1)).toBe("00:00");
  });
});
