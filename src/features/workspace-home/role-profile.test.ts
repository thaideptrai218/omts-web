import { describe, expect, it } from "vitest";
import type { FunctionPermission } from "@/features/access/domain/function-permission";
import { fieldBlocks, moneyBlocks } from "./home-blocks";
import { cashBookFirst, orderGroups, roleProfile } from "./role-profile";

const grant = (functionCode: string, actions: string[], scope: FunctionPermission["scope"]): FunctionPermission[] =>
  actions.map((action) => ({ functionCode, action: action as FunctionPermission["action"], scope, dataScope: "AssignedZone" }));
const zones = { kind: "zones", zoneIds: ["z1"] } as const, all = { kind: "all-zones" } as const;
const full = ["View", "Create", "Edit", "Delete"];

// Bộ quyền của Quản lý vùng và Kế toán theo FixedRoles.cs (sau quyết định 20/11: Quản lý vùng không bán hàng).
const zoneManager: FunctionPermission[] = [
  ...["CULTIVATION_CYCLES", "CULTIVATION_LOGS", "WATER_MEASUREMENTS", "HARVESTS", "HARVEST_LOTS", "WORK_ASSIGNMENTS", "ATTENDANCE", "PURCHASE_RECEIPTS"].flatMap((code) => grant(code, full, zones)),
  ...grant("HARVEST_PLANS", ["View"], zones),
];
const accountant: FunctionPermission[] = [
  ...["CUSTOMER_PAYMENTS", "SUPPLIER_PAYMENTS", "CASH_BOOK", "SALES_REPORTS"].flatMap((code) => grant(code, full, all)),
  ...grant("PAYROLL", ["View", "Export"], all),
];
const groups = ["Nuôi trồng", "Vật tư & Giống", "Mua hàng", "Nhân sự", "Kinh doanh", "Báo cáo"].map((label) => ({ label }));
const labels = (profile: Parameters<typeof orderGroups>[1]) => orderGroups(groups, profile).map((group) => group.label);

describe("role profile from permission codes", () => {
  it("never reads the role name: owner by subject, staff by the codes held", () => {
    expect(roleProfile({ subjectType: "CooperativeOwner" }, [])).toBe("owner");
    expect(roleProfile({ subjectType: "Staff" }, zoneManager)).toBe("field");
    expect(roleProfile({ subjectType: "Staff" }, accountant)).toBe("finance");
    expect(roleProfile({ subjectType: "Staff" }, [])).toBe("general");
    expect(roleProfile({ subjectType: "Trader" }, zoneManager)).toBe("general");
  });
  it("orders menu groups per role and keeps the Owner order", () => {
    expect(labels("owner")).toEqual(groups.map((group) => group.label));
    expect(labels("field")).toEqual(["Nuôi trồng", "Nhân sự", "Vật tư & Giống", "Mua hàng", "Kinh doanh", "Báo cáo"]);
    expect(labels("finance")).toEqual(["Mua hàng", "Kinh doanh", "Báo cáo", "Nuôi trồng", "Vật tư & Giống", "Nhân sự"]);
    expect(cashBookFirst("finance")).toBe(true);
    expect(cashBookFirst("field")).toBe(false);
  });
});

describe("home blocks by permission", () => {
  it("shows the zone manager the field blocks and no money block", () => {
    expect(fieldBlocks({ subjectType: "Staff" }, zoneManager)).toEqual(["attendance", "plans", "lots", "nursery", "water"]);
    expect(moneyBlocks({ subjectType: "Staff" }, zoneManager)).toEqual([]);
  });
  it("hides a field block whose screen the account cannot open", () => {
    const noWater = zoneManager.filter((item) => item.functionCode !== "WATER_MEASUREMENTS");
    const noPlans = zoneManager.filter((item) => item.functionCode !== "HARVEST_PLANS");
    expect(fieldBlocks({ subjectType: "Staff" }, noWater)).not.toContain("water");
    expect(fieldBlocks({ subjectType: "Staff" }, noPlans)).not.toContain("plans");
  });
  it("shows the accountant only money blocks, never payroll", () => {
    expect(moneyBlocks({ subjectType: "Staff" }, accountant)).toEqual(["supplier-debts", "customer-awaiting"]);
    expect(fieldBlocks({ subjectType: "Staff" }, accountant)).toEqual([]);
  });
  it("gives the owner neither role block (the owner has the approvals block of the overview)", () => {
    expect(fieldBlocks({ subjectType: "CooperativeOwner" }, [])).toEqual([]);
    expect(moneyBlocks({ subjectType: "CooperativeOwner" }, [])).toEqual([]);
  });
});
