import { expect, it } from "vitest";
import {
  formatVietnameseDate,
  isDateOnly,
  parseVietnameseDateInput,
  vietnameseBusinessDate,
} from "./date-only";

it.each(["2026-01-02", "2000-02-29", "0001-01-01"])(
  "round-trips %s without timezone conversion",
  (value) => {
    expect(parseVietnameseDateInput(formatVietnameseDate(value))).toBe(value);
  },
);
it.each(["2025-02-29", "1900-02-29", "2026-04-31", "0000-01-01", "2026-13-01"])(
  "rejects impossible date %s",
  (value) => {
    expect(isDateOnly(value)).toBe(false);
  },
);
it("interprets day before month and accepts compact Vietnamese input", () => {
  expect(parseVietnameseDateInput("2/1/2026")).toBe("2026-01-02");
  expect(parseVietnameseDateInput("28022026")).toBe("2026-02-28");
});
it.each(["", "2/", "31/02/2026", "2026-02-30"])(
  "preserves invalid or incomplete entry %s",
  (value) => {
    expect(parseVietnameseDateInput(value)).toBe(value);
  },
);
it("uses the Vietnamese date after midnight even when UTC is still yesterday", () => {
  expect(vietnameseBusinessDate(new Date("2026-10-27T18:00:00Z"))).toBe(
    "2026-10-28",
  );
});
