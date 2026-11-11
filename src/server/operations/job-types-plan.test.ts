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
