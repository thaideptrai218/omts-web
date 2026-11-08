// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
const api = vi.hoisted(() => ({ readTraderRequests: vi.fn(), decideTraderRequest: vi.fn() }));
vi.mock("./repository", () => api);
vi.mock("@/components/ui/dialog", () => ({ Dialog: ({ children }: { children: ReactNode }) => <div role="dialog">{children}</div> }));
import { TraderRequestsDialog } from "./requests-dialog";
const row = { accountId: "qa", displayName: "QA Trader", phoneNumber: "0900000090", note: "QA note", requestedAt: null, status: "PENDING_APPROVAL", rejectionReason: null };
afterEach(() => { cleanup(); vi.clearAllMocks(); });
it("requires explicit approval confirmation and cancel makes no write", async () => {
  api.readTraderRequests.mockResolvedValue({ status: "success", data: [row] }); api.decideTraderRequest.mockResolvedValue({ status: "success", data: { ...row, status: "ACTIVE" } });
  render(<TraderRequestsDialog onClose={vi.fn()} />); fireEvent.click(await screen.findByRole("button", { name: "Duyệt yêu cầu" })); expect(api.decideTraderRequest).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Hủy xác nhận" })); expect(api.decideTraderRequest).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Duyệt yêu cầu" })); fireEvent.click(screen.getByRole("button", { name: "Xác nhận duyệt" })); await screen.findByRole("status");
  expect(api.decideTraderRequest).toHaveBeenCalledWith({ action: "approve", accountId: "qa", confirmed: true });
});
it("requires a rejection reason and retains it after ambiguous results and reload", async () => {
  api.readTraderRequests.mockResolvedValue({ status: "success", data: [row] }); api.decideTraderRequest.mockResolvedValue({ status: "error", httpStatus: 503, uncertain: true });
  render(<TraderRequestsDialog onClose={vi.fn()} />); fireEvent.click(await screen.findByRole("button", { name: "Từ chối yêu cầu" })); const confirm = screen.getByRole("button", { name: "Xác nhận từ chối" }) as HTMLButtonElement; expect(confirm.disabled).toBe(true);
  fireEvent.change(screen.getByRole("textbox", { name: /Lý do từ chối/ }), { target: { value: "Không đủ thông tin" } }); fireEvent.click(confirm); await screen.findByText(/Chưa xác định được kết quả/);
  fireEvent.click(screen.getByRole("button", { name: "Tải lại danh sách" })); await vi.waitFor(() => expect(api.readTraderRequests).toHaveBeenCalledTimes(2));
  expect((screen.getByRole("textbox", { name: /Lý do từ chối/ }) as HTMLTextAreaElement).value).toBe("Không đủ thông tin"); expect(confirm.disabled).toBe(true); expect(api.decideTraderRequest).toHaveBeenCalledTimes(1);
});
it("shows rejected rows without decision actions", async () => {
  api.readTraderRequests.mockResolvedValue({ status: "success", data: [{ ...row, status: "REJECTED", rejectionReason: "QA reason" }] });
  render(<TraderRequestsDialog onClose={vi.fn()} />); await screen.findByText("Lý do từ chối: QA reason"); expect(screen.queryByRole("button", { name: "Duyệt yêu cầu" })).toBeNull();
});
