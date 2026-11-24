import { describe, expect, it } from "vitest";
import { roleDisplayName } from "./role-display-name";

describe("roleDisplayName", () => {
  it("maps role codes to Vietnamese", () => {
    expect(roleDisplayName("ZONE_MANAGER")).toBe("Quản lý vùng");
    expect(roleDisplayName("ACCOUNTANT", "Accountant")).toBe("Kế toán");
  });
  it("maps English role names from the backend when no code is sent", () => {
    expect(roleDisplayName(undefined, "Zone Manager")).toBe("Quản lý vùng");
    expect(roleDisplayName(null, "zone-manager")).toBe("Quản lý vùng");
    expect(roleDisplayName(undefined, "Accountant")).toBe("Kế toán");
  });
  it("keeps an unknown role as sent", () => {
    expect(roleDisplayName(undefined, "Nhân viên")).toBe("Nhân viên");
    expect(roleDisplayName("CUSTOM")).toBe("CUSTOM");
    expect(roleDisplayName()).toBe("");
  });
});
