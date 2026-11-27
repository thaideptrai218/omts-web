import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { laborCostsPlan as plan } from "./labor-costs-plan";

const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const q = (s: string) => new URLSearchParams(s);
const url = (p: { path: string } | undefined) => new URL(p!.path, "http://x");

describe("labor costs plan: zone filter", () => {
  it("sends the chosen zones as repeated zoneIds, for the list and for the file", () => {
    const list = plan("GET", q(`action=rafts&from=2026-11-01&to=2026-11-30&zoneIds=${id(1)}%2C${id(2)}`));
    expect(list).toMatchObject({ permission: "View" });
    expect(list?.zoneId).toBeUndefined();
    expect(url(list).searchParams.getAll("zoneIds")).toEqual([id(1), id(2)]);
    const file = plan("GET", q(`action=export&from=2026-11-01&to=2026-11-30&format=pdf&zoneIds=${id(1)}`));
    expect(file).toMatchObject({ permission: "Export", file: "export" });
    expect(url(file).searchParams.getAll("zoneIds")).toEqual([id(1)]);
  });
  it("asks for every zone without zoneIds and refuses the old zoneId, bad ids and repeats", () => {
    expect(url(plan("GET", q("action=rafts&from=2026-11-01&to=2026-11-30"))).searchParams.has("zoneIds")).toBe(false);
    for (const bad of [`zoneId=${id(1)}`, "zoneIds=abc", `zoneIds=${id(1)},abc`, "zoneIds=", `zoneIds=${id(1)}&zoneIds=${id(2)}`]) {
      expect(plan("GET", q(`action=rafts&from=2026-11-01&to=2026-11-30&${bad}`)), bad).toBeUndefined();
    }
  });
});
