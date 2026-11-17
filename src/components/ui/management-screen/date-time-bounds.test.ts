import { describe, expect, it } from "vitest";
import { dateTimeBoundsError } from "./date-time-bounds";

describe("local datetime limits", () => {
  it("rejects times outside a window on the same day", () => {
    expect(dateTimeBoundsError("2026-11-12T08:29", "2026-11-12T08:30")).toBeTruthy();
    expect(dateTimeBoundsError("2026-11-12T18:01", undefined, "2026-11-12T18:00")).toBeTruthy();
  });
  it("allows inclusive limits and normalizes seconds to the control's minute precision", () => {
    expect(dateTimeBoundsError("2026-11-12T08:30", "2026-11-12T08:30:00", "2026-11-12T08:30:00")).toBeUndefined();
    expect(dateTimeBoundsError("2026-11-12T08:30", "2026-11-11", "2026-11-13")).toBeUndefined();
  });
});
