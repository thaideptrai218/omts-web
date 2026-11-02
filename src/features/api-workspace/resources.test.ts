import { describe, expect, it } from "vitest";
import { projectResource, resourceAllowed } from "./resources";

const id = "529ec3ce-af8f-42f7-a08f-4bab36ba7e62";
describe("API workspace data and actor boundaries", () => {
  it("projects only the permitted account fields", () => {
    const account = { id, username: "fixture", displayName: "Fixture", phoneNumber: null, email: null, status: "Active", rowVersion: "AQID",
      passwordHash: "must-not-leave-server", accessToken: "must-not-leave-server" };
    const result = projectResource("accounts", { items: [account], page: 1, pageSize: 20, total: 1 }, false);
    expect(JSON.stringify(result)).not.toContain("must-not-leave-server");
    expect(result).toMatchObject({ items: [{ username: "fixture" }] });
  });
  it("does not turn a malformed response into a successful empty list", () => {
    expect(projectResource("zones", { items: [], page: 0, pageSize: 20, total: 0 }, false)).toBeUndefined();
    expect(projectResource("zones", { items: [{ id }], page: 1, pageSize: 20, total: 1 }, false)).toBeUndefined();
  });
  it("pages array endpoints without repeating all records on the next page", () => {
    const rows = Array.from({ length: 25 }, (_, index) => ({ id, name: `Vai trò ${index + 1}`, status: "InUse" }));
    expect(projectResource("roles", rows, false, { page: 2, pageSize: 20 })).toMatchObject({
      page: 2, pageSize: 20, total: 25, items: rows.slice(20),
    });
  });
  it("searches the complete array before paging and clamps a removed last page", () => {
    const rows = Array.from({ length: 25 }, (_, index) => ({ id, name: `Vai trò ${index + 1}`, status: "InUse" }));
    expect(projectResource("roles", rows, false, { page: 2, pageSize: 20, search: "Vai trò 25" })).toMatchObject({
      page: 1, pageSize: 20, total: 1, items: [rows[24]],
    });
  });
  it("keeps owner administration and staff grant permissions distinct", () => {
    const owner = { subjectType: "CooperativeOwner" }, staff = { subjectType: "Staff" };
    expect(resourceAllowed("accounts", owner, [], "Edit")).toBe(true);
    expect(resourceAllowed("accounts", staff, [{ functionCode: "SUPPLIERS", action: "Edit" }], "Edit")).toBe(false);
    expect(resourceAllowed("suppliers", staff, [{ functionCode: "SUPPLIERS", action: "View" }], "View")).toBe(true);
    expect(resourceAllowed("suppliers", staff, [{ functionCode: "SUPPLIERS", action: "View" }], "Edit")).toBe(false);
    expect(resourceAllowed("input-items", staff, [{ functionCode: "PURCHASE_RECEIPTS", action: "View" }], "View")).toBe(true);
    expect(resourceAllowed("input-items", staff, [{ functionCode: "PURCHASE_RECEIPTS", action: "View" }], "Create")).toBe(false);
    expect(resourceAllowed("zones", { subjectType: "Trader" }, [])).toBe(false);
  });
});

it("rejects stale supplier and item contracts instead of acknowledging dropped catalogue fields", () => {
  const base = { id, name: "Supplier", supplierType: "Material", phoneNumber: "0900000000", statusId: 101, status: "In Use", rowVersion: "v1" };
  expect(projectResource("suppliers", { ...base, otherContacts: "old address", debt: 100 }, true)).toBeUndefined();
  expect(projectResource("suppliers", { ...base, address: "Address", email: null, debt: 100 }, true)).toEqual({ ...base, address: "Address", email: null });
  expect(projectResource("input-items", { id, code: "VT001", name: "Item", group: "RaftMaterial", unit: "cái", statusId: 101, status: "In Use", rowVersion: "v1", isUsed: true, description: null }, true)).toBeUndefined();
});
