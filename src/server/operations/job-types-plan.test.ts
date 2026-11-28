import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { jobTypesPlan } from "./job-types-plan";

const list = (query: string) => jobTypesPlan("GET", new URLSearchParams(query));

describe("job types list plan: sort pass-through", () => {
  it("keeps the default order when no sort is given", () => {
    expect(list("action=list&page=1")?.path).toBe("/api/job-types?page=1");
  });
  it.each(["name", "rate", "effectiveFrom", "status"])("forwards sortBy=%s with a direction", (sortBy) => {
    expect(list(`action=list&sortBy=${sortBy}&sortDir=desc`)?.path).toBe(`/api/job-types?sortBy=${sortBy}&sortDir=desc`);
  });
  it.each(["action=list&sortBy=password", "action=list&sortBy=rate&sortDir=up", "action=list&sortBy=name&sortBy=rate", "action=list&sortDir=ASC"])("rejects %s", (query) => {
    expect(list(query)).toBeUndefined();
  });
  it("does not accept sort parameters on a detail read", () => {
    expect(list("action=detail&id=122bb318-a72e-49aa-a8d7-a6169f889007&sortBy=name")).toBeUndefined();
  });
});

describe("job type shift rate plan", () => {
  const id = "122bb318-a72e-49aa-a8d7-a6169f889007";
  const post = (body: unknown) => jobTypesPlan("POST", new URLSearchParams(), { action: "shift-rate", id, body });
  it("posts a shift rate to the shift-rates route with the row version", () => {
    expect(post({ shiftRate: 300000, effectiveFrom: "2026-10-01", rowVersion: "AQ" })).toMatchObject({ method: "POST", path: `/api/job-types/${id}/shift-rates`, permission: "Edit", body: { shiftRate: 300000, effectiveFrom: "2026-10-01", rowVersion: "AQ" } });
  });
  it.each([{ shiftRate: 0, effectiveFrom: "2026-10-01", rowVersion: "AQ" }, { shiftRate: 1.5, effectiveFrom: "2026-10-01", rowVersion: "AQ" }, { hourlyRate: 3000, effectiveFrom: "2026-10-01", rowVersion: "AQ" }, { shiftRate: 3000, effectiveFrom: "2026-10-01" }])("rejects %j", (body) => {
    expect(post(body)).toBeUndefined();
  });
  it("accepts an optional shift rate when a job type is created", () => {
    expect(jobTypesPlan("POST", new URLSearchParams(), { action: "create", body: { name: "Thu hoạch", hourlyRate: 30000, effectiveFrom: "2026-10-01", shiftRate: 300000 } })).toMatchObject({ path: "/api/job-types" });
  });
});
