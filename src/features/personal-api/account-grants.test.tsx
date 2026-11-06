// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
const read = vi.hoisted(() => vi.fn());
const revoke = vi.hoisted(() => vi.fn());
vi.mock("./account-grants-repository", () => ({ readAccountGrants: read, revokeAccountGrant: revoke }));
vi.mock("@/components/ui/dialog", () => ({ Dialog: ({ title, children }: { title: string; children: ReactNode }) => <div role="dialog" aria-label={title}>{children}</div> }));
import { AccountGrantHistory } from "./account-grants";
afterEach(() => { cleanup(); vi.clearAllMocks(); });
describe("account grant history", () => {
  it("shows server states and keeps revoked rows with their reason", async () => {
    read.mockResolvedValue({ status: "success", data: [ { id: "1", roleName: "Kế toán", allZones: true, effectiveFrom: "2026-01-01", effectiveTo: "2026-10-01", state: "Expired" }, { id: "2", roleName: "Nhân viên", allZones: false, zoneName: "Vùng Đông", effectiveFrom: "2026-01-01", effectiveTo: null, state: "Revoked", revokedAt: "2026-10-01T00:00:00Z", revokeReason: "Đã chuyển việc" } ] });
    render(<AccountGrantHistory accountId="qa-account" />); await screen.findByText("Kế toán · Hết hạn"); expect(screen.getByText("Lý do: Đã chuyển việc")).toBeTruthy(); fireEvent.change(screen.getByLabelText("Tình trạng phân quyền"), { target: { value: "Revoked" } }); expect(screen.queryByText("Kế toán · Hết hạn")).toBeNull(); expect(screen.getByText("Nhân viên · Đã thu hồi")).toBeTruthy(); expect(read).toHaveBeenCalledTimes(1); expect(screen.queryByRole("button", { name: "Thu hồi" })).toBeNull();
  });
  it("offers a manual read retry without changing grants", async () => {
    read.mockResolvedValueOnce({ status: "error", httpStatus: 503, uncertain: false }).mockResolvedValueOnce({ status: "success", data: [] }); render(<AccountGrantHistory accountId="qa-account" />); fireEvent.click(await screen.findByRole("button", { name: "Tải lại phân quyền" })); await screen.findByText("Không có cặp vùng – vai trò phù hợp."); expect(read).toHaveBeenCalledTimes(2);
  });
});
const activeRow = () => ({ id: "grant-1", roleId: "role-1", roleName: "Kế toán", zoneId: null, zoneName: null, allZones: true, effectiveFrom: "2026-01-01", effectiveTo: null, state: "Effective", revokedAt: null, revokeReason: null });
describe("explicit grant revocation", () => {
  it("requires a reason and confirmation before revoking, retaining the historical row", async () => {
    const row = activeRow(); read.mockResolvedValue({ status: "success", data: [row] }); revoke.mockResolvedValue({ status: "success", data: { ...row, state: "Revoked", revokeReason: "Đổi việc" } }); render(<AccountGrantHistory accountId="qa-account" canRevoke />);
    fireEvent.click(await screen.findByRole("button", { name: "Thu hồi · Kế toán" })); expect(revoke).not.toHaveBeenCalled(); expect((screen.getByRole("button", { name: "Xác nhận thu hồi" }) as HTMLButtonElement).disabled).toBe(true); fireEvent.change(screen.getByLabelText("Lý do thu hồi"), { target: { value: " Đổi việc " } }); fireEvent.click(screen.getByRole("button", { name: "Xác nhận thu hồi" })); await screen.findByText("Đã thu hồi phân quyền."); expect(revoke).toHaveBeenCalledWith("qa-account", "grant-1", "Đổi việc"); expect(screen.getByText("Kế toán · Đã thu hồi")).toBeTruthy(); expect(screen.queryByRole("button", { name: "Thu hồi · Kế toán" })).toBeNull();
  });
  it("never replays an uncertain revocation after a successful history read", async () => {
    read.mockResolvedValue({ status: "success", data: [activeRow()] }); revoke.mockResolvedValue({ status: "error", httpStatus: 401, uncertain: true }); render(<AccountGrantHistory accountId="qa-account" canRevoke />); fireEvent.click(await screen.findByRole("button", { name: "Thu hồi · Kế toán" })); fireEvent.change(screen.getByLabelText("Lý do thu hồi"), { target: { value: "Đổi việc" } }); fireEvent.click(screen.getByRole("button", { name: "Xác nhận thu hồi" })); await screen.findByText("Hãy đối chiếu lịch sử hiện tại trước khi thực hiện lượt mới. Lệnh thu hồi không được gửi lại tự động."); fireEvent.click(screen.getByRole("button", { name: "Để sau" })); fireEvent.click(screen.getByRole("button", { name: "Tải lại phân quyền" })); await screen.findByText("Kế toán · Hiệu lực"); expect(revoke).toHaveBeenCalledTimes(1); expect((screen.getByRole("button", { name: "Thu hồi · Kế toán" }) as HTMLButtonElement).disabled).toBe(true); expect(screen.queryByRole("button", { name: "Đã đối chiếu lịch sử" })).toBeNull();
  });
});
