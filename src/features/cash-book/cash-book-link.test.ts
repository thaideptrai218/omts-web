import { describe, expect, it } from "vitest";
import { cashBookStart } from "./cash-book-link";

describe("cash book entry from a link", () => {
  it("lands on the voucher code across all funds and all time", () => {
    const start = cashBookStart(new URLSearchParams({ search: " TT000012 " }));
    expect(start).toMatchObject({ fund: "All", search: "TT000012", time: { preset: "all", from: "", to: "" } });
  });
  it("opens on the cash fund of this month without a link", () => {
    const start = cashBookStart(new URLSearchParams());
    expect(start.fund).toBe("Cash"); expect(start.search).toBe(""); expect(start.time).toMatchObject({ preset: "thisMonth" });
    expect(cashBookStart(null).fund).toBe("Cash");
  });
  it("caps a long search at the 100 characters the box accepts", () => {
    expect(cashBookStart(new URLSearchParams({ search: "x".repeat(300) })).search).toHaveLength(100);
  });
});
