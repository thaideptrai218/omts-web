// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
const read = vi.hoisted(() => vi.fn());
vi.mock("./account-grants-repository", () => ({ readAccountGrants: read }));
import { AccountGrantHistory } from "./account-grants";
afterEach(() => { cleanup(); vi.clearAllMocks(); });
const open = () => fireEvent.click(screen.getByText("Lịch sử phân quyền"));
describe("account grant history (read-only, collapsed)", () => {
  it("reads nothing until opened, then shows server states and keeps revoked rows with their reason", async () => {
    read.mockResolvedValue({ status: "success", data: [ { id: "1", roleName: "Kế toán", allZones: true, effectiveFrom: "2026-01-01", effectiveTo: "2026-10-01", state: "Expired" }, { id: "2", roleName: "Nhân viên", allZones: false, zoneName: "Vùng Đông", effectiveFrom: "2026-01-01", effectiveTo: null, state: "Revoked", revokedAt: "2026-10-01T00:00:00Z", revokeReason: "Đã chuyển việc" } ] });
    render(<AccountGrantHistory accountId="qa-account" />);
    expect(read).not.toHaveBeenCalled();
    open(); await screen.findByText("Kế toán · Hết hạn"); expect(screen.getByText("Lý do: Đã chuyển việc")).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Tình trạng phân quyền"), { target: { value: "Revoked" } });
    expect(screen.queryByText("Kế toán · Hết hạn")).toBeNull(); expect(screen.getByText("Nhân viên · Đã thu hồi")).toBeTruthy(); expect(read).toHaveBeenCalledTimes(1);
    // Audit only: no add form and no revoke button live here any more.
    expect(screen.queryByRole("button", { name: /Thêm phân quyền|Thu hồi/ })).toBeNull();
  });
  it("offers a manual read retry without changing grants", async () => {
    read.mockResolvedValueOnce({ status: "error", httpStatus: 503, uncertain: false }).mockResolvedValueOnce({ status: "success", data: [] });
    render(<AccountGrantHistory accountId="qa-account" />); open();
    fireEvent.click(await screen.findByRole("button", { name: "Tải lại phân quyền" })); await screen.findByText("Không có cặp vùng – vai trò phù hợp."); expect(read).toHaveBeenCalledTimes(2);
  });
});
