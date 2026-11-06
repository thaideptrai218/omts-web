// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
const reads = vi.hoisted(() => ({ functions: vi.fn(), impact: vi.fn() }));
vi.mock("./account-grants-repository", () => ({ readPermissionFunctions: reads.functions, readRoleImpact: reads.impact }));
import { RolePermissionReadView } from "./role-read-view";
afterEach(() => { cleanup(); vi.clearAllMocks(); });
const fixture = () => ({ id: "test-role", description: "Vai trò kiểm thử", permissions: [{ functionCode: "WATER_MEASUREMENTS", actions: ["View", "Export"] }] });
describe("read-only live role matrix", () => {
  it("renders actual supported actions and scope without editable permission controls", async () => {
    reads.functions.mockResolvedValue({ status: "success", data: [{ code: "WATER_MEASUREMENTS", name: "Water", cooperativeWide: false, isDashboardTile: false, supportedActions: ["View", "Create", "Edit", "Export"] }] }); reads.impact.mockResolvedValue({ status: "success", data: { accountCount: 2, zoneCount: 1, allZonesGranted: false, accounts: ["staff1", "staff2"] } });
    render(<RolePermissionReadView record={fixture()} />); const row = await screen.findByRole("row", { name: /Theo dõi chất lượng nước/ }); expect(within(row).getByText("Xem")).toBeTruthy(); expect(within(row).getByText("Xuất")).toBeTruthy(); expect(within(row).queryByText("Tạo")).toBeNull(); expect(within(row).getByText("Trong vùng được cấp")).toBeTruthy(); expect(screen.queryByRole("checkbox")).toBeNull(); expect(screen.queryByRole("button", { name: "Lưu" })).toBeNull(); expect(reads.impact).not.toHaveBeenCalled();
  });
  it("retries a failed catalog read without running any mutation", async () => {
    reads.functions.mockResolvedValueOnce({ status: "error", httpStatus: 503, uncertain: false }).mockResolvedValueOnce({ status: "success", data: [] }); reads.impact.mockResolvedValue({ status: "success", data: { accountCount: 0, zoneCount: 0, allZonesGranted: false, accounts: [] } }); render(<RolePermissionReadView record={{ id: "test-role", permissions: [] }} />); fireEvent.click(await screen.findByRole("button", { name: "Tải lại danh mục quyền" })); await screen.findByText("Không có dữ liệu phù hợp."); expect(reads.functions).toHaveBeenCalledTimes(2);
  });
});
