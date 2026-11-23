import { describe, expect, it, vi } from "vitest";
import { accountNameMatches, searchWithAccountNames } from "./employee-account-name-search";

const row = (id: string, username?: string) => ({ id, fullName: `NV ${id}`, account: username ? { id: `a-${id}`, username, displayName: id, status: "Active" } : null }) as never;
const page = (items: unknown[], total = items.length) => ({ status: "success" as const, data: { items, page: 1, pageSize: 15, total } }) as never;

describe("employee search by login name", () => {
  it("matches the username case-insensitively, with or without @", () => {
    expect(accountNameMatches(row("1", "QuanLyVung1"), "quanlyvung")).toBe(true);
    expect(accountNameMatches(row("1", "quanlyvung1"), "@quanlyvung1")).toBe(true);
    expect(accountNameMatches(row("2"), "quanly")).toBe(false);
    expect(accountNameMatches(row("1", "ketoan"), "  ")).toBe(false);
  });
  it("adds the owner of a matching account when the backend search finds nothing", async () => {
    const readAll = vi.fn().mockResolvedValue(page([row("1", "ketoan"), row("2", "quanlyvung1")]));
    const result = await searchWithAccountNames("quanlyvung1", 15, async () => page([]), readAll);
    expect(result).toMatchObject({ status: "success", data: { total: 1, items: [{ id: "2" }] } });
  });
  it("does not duplicate an employee the backend already found and keeps the backend result otherwise", async () => {
    const found = row("2", "quanlyvung1");
    const same = await searchWithAccountNames("quanlyvung1", 15, async () => page([found]), async () => page([found]));
    expect(same).toMatchObject({ data: { total: 1, items: [{ id: "2" }] } });
    const none = await searchWithAccountNames("zzz", 15, async () => page([]), async () => page([row("1", "ketoan")]));
    expect(none).toMatchObject({ data: { total: 0, items: [] } });
  });
  it("does not read anything extra without a search term, and survives a failing extra read", async () => {
    const readAll = vi.fn();
    await searchWithAccountNames("", 15, async () => page([]), readAll);
    expect(readAll).not.toHaveBeenCalled();
    const result = await searchWithAccountNames("a", 15, async () => page([row("9")]), async () => { throw new Error("offline"); });
    expect(result).toMatchObject({ data: { items: [{ id: "9" }] } });
  });
  it("leaves the backend paging alone when the merged result would not fit one page", async () => {
    const full = Array.from({ length: 15 }, (_, index) => row(`p${index}`));
    const result = await searchWithAccountNames("ketoan", 15, async () => page(full, 40), async () => page([row("x", "ketoan")]));
    expect(result).toMatchObject({ data: { total: 40 } });
  });
  it("only reads the unfiltered list a bounded number of pages", async () => {
    const readAll = vi.fn().mockResolvedValue(page([row("1", "a")], 100000));
    await searchWithAccountNames("zz", 15, async () => page([]), readAll);
    expect(readAll.mock.calls.length).toBeLessThanOrEqual(5);
  });
});
