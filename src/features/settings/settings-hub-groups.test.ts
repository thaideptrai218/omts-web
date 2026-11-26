import { describe, expect, it } from "vitest";
import { buildSettingsGroups, type SettingsGate } from "./settings-hub-groups";
import { filterSettingsGroups, normaliseSettingsQuery, pickSettingsItem, settingsItemKey, suggestSettingsItems } from "./settings-hub-filter";

const none: SettingsGate = { isOwner: false, holds: () => false, operation: () => false, canReadProducts: false };
/** An Owner passes every gate, like the real workspace checks do. */
const owner: SettingsGate = { isOwner: true, holds: () => true, operation: () => true, canReadProducts: true };
const labels = (gate: SettingsGate) => buildSettingsGroups(gate).flatMap((group) => group.items.map((item) => item.label));

describe("settings hub groups", () => {
  it("shows the Owner every group in KiotViet order, each item with an editor caption", () => {
    const groups = buildSettingsGroups(owner);
    expect(groups.map((group) => group.key)).toEqual(["cooperative", "users", "farming", "inputs", "hr", "sales", "finance", "system"]);
    expect(groups.flatMap((group) => group.items).every((item) => !!item.editor)).toBe(true);
  });

  it("lists Tài khoản người dùng and Vai trò và quyền under Người dùng, each opening its own page", () => {
    const users = buildSettingsGroups(owner).find((group) => group.key === "users");
    expect(users?.label).toBe("Người dùng");
    expect(users?.items.map((item) => [item.label, item.href])).toEqual([["Tài khoản người dùng", "/workspace/accounts"], ["Vai trò và quyền", "/workspace/roles"]]);
    expect(labels(owner)).not.toContain("Quản lý người dùng");
  });

  it("hides the Người dùng group from everyone but the Owner", () => {
    expect(labels({ ...none, holds: () => true, operation: () => true, canReadProducts: true })).not.toContain("Tài khoản người dùng");
    expect(buildSettingsGroups(none).some((group) => group.key === "users")).toBe(false);
  });

  it("hides every Owner-only setting from a zone manager: reading farming data does not make a setting editable", () => {
    const held = ["CULTIVATION_CYCLES", "INPUT_ISSUES", "CUSTOMERS"];
    const manager: SettingsGate = { ...none, holds: (fn, action) => held.includes(fn) && action === "View", operation: (area) => area === "water", canReadProducts: true };
    expect(labels(manager)).toEqual([]);
  });

  it("gates by held codes and not by role: CASH_BOOK_SETTINGS Edit alone opens only the cash book settings", () => {
    const accountant: SettingsGate = { ...none, holds: (fn, action) => fn === "CASH_BOOK_SETTINGS" && action === "Edit" };
    expect(labels(accountant)).toEqual(["Sổ quỹ"]);
  });

  it("does not show the cash book settings to someone who can only view them", () => {
    expect(labels({ ...none, holds: (fn, action) => fn === "CASH_BOOK_SETTINGS" && action === "View" })).toEqual([]);
  });

  it("returns no groups when nothing is permitted, so the shell hides the gear", () => {
    expect(buildSettingsGroups(none)).toEqual([]);
  });
});

describe("settings hub search and selection", () => {
  const groups = buildSettingsGroups(owner);
  it("normalises case, accents and surrounding spaces", () => {
    expect(normaliseSettingsQuery("  Ngưỡng NƯỚC ")).toBe("nguong nuoc");
  });
  it("filters by title without regard to accents and drops empty groups", () => {
    const found = filterSettingsGroups(groups, "NGUONG nuoc");
    expect(found.map((group) => group.key)).toEqual(["farming"]);
    expect(found[0].items.map((item) => item.label)).toEqual(["Ngưỡng nước"]);
    expect(filterSettingsGroups(groups, "khong co gi")).toEqual([]);
    expect(filterSettingsGroups(groups, "   ")).toHaveLength(groups.length);
  });
  it("finds items by meaning: synonyms with and without accents", () => {
    const find = (query: string) => filterSettingsGroups(groups, query).flatMap((group) => group.items.map((item) => item.label));
    expect(find("phan quyen")).toEqual(["Tài khoản người dùng", "Vai trò và quyền"]);
    expect(find("mật khẩu")).toContain("Tài khoản người dùng");
    expect(find("nhan vien dang nhap")).toEqual(["Tài khoản người dùng"]);
    expect(find("đơn giá")).toContain("Loại công việc và đơn giá");
    expect(find("thu chi")).toEqual(["Sổ quỹ"]);
    expect(find("ví")).toContain("Sổ quỹ");
  });
  it("every item has synonyms and suggestions never come back empty", () => {
    expect(groups.flatMap((group) => group.items).every((item) => (item.keywords ?? []).length > 0)).toBe(true);
    expect(suggestSettingsItems(groups)).toHaveLength(3);
    expect(suggestSettingsItems([])).toEqual([]);
  });
  it("captions who may edit in plain short Vietnamese", () => {
    const captions = new Set(groups.flatMap((group) => group.items.map((item) => item.editor)));
    expect([...captions].some((caption) => /Ai sửa được/.test(caption ?? ""))).toBe(false);
    expect(captions.has("Chỉ chủ hợp tác xã sửa được")).toBe(true);
  });
  it("prefers ?section=, then the ?group= first item, then the first item", () => {
    expect(settingsItemKey(pickSettingsItem(groups, "harvest", "hr")!)).toBe("harvest");
    expect(pickSettingsItem(groups, null, "hr")?.label).toBe("Thiết lập chấm công");
    expect(pickSettingsItem(groups, "missing", "missing")?.label).toBe("Hồ sơ hợp tác xã");
    expect(pickSettingsItem([], null, null)).toBeUndefined();
  });
});
