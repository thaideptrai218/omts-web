// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
const api = vi.hoisted(() => ({ readInbox: vi.fn(), markInboxRead: vi.fn(), openInboxRecord: vi.fn(), push: vi.fn() }));
vi.mock("./repository", () => api);
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: api.push }) }));
vi.mock("./record-dialog", () => ({ NotificationRecordDialog: ({ onClose }: { onClose(): void }) => <div role="dialog" aria-label="Hồ sơ liên quan"><button onClick={onClose}>Về hộp thư</button></div> }));
vi.mock("@/components/ui/dialog", () => ({ Dialog: ({ children }: { children: ReactNode }) => <div role="dialog">{children}</div> }));
import { InboxDialog } from "./inbox-dialog";
const row = { id: "id", title: "Test notification", body: "<script>not executed</script>", createdAt: "2026-10-30T00:00:00Z", readAt: null, isMandatory: true };
afterEach(() => { cleanup(); vi.clearAllMocks(); });
it("does not mark read just by opening and reloads after an explicit acknowledgement", async () => {
  api.readInbox.mockResolvedValue({ status: "success", data: { items: [row], total: 1, unreadCount: 1 } }); api.markInboxRead.mockResolvedValue({ status: "success", data: { saved: true } });
  render(<InboxDialog onClose={vi.fn()} />); await screen.findByText(row.title); expect(api.markInboxRead).not.toHaveBeenCalled(); expect(screen.getByText(row.body).querySelector("script")).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Đánh dấu đã đọc" })); await screen.findByRole("status"); expect(api.markInboxRead).toHaveBeenCalledWith({ action: "read", id: "id" });
});
it("keeps an ambiguous write blocked after reload without replay", async () => {
  api.readInbox.mockResolvedValue({ status: "success", data: { items: [row], total: 1, unreadCount: 1 } }); api.markInboxRead.mockResolvedValue({ status: "error", httpStatus: 503, uncertain: true });
  render(<InboxDialog onClose={vi.fn()} />); fireEvent.click(await screen.findByRole("button", { name: "Đánh dấu đã đọc" })); await screen.findByText(/Chưa xác định được kết quả/);
  fireEvent.click(screen.getByRole("button", { name: "Tải lại" })); await vi.waitFor(() => expect(api.readInbox).toHaveBeenCalledTimes(2)); expect(api.markInboxRead).toHaveBeenCalledTimes(1);
  expect((screen.getByRole("button", { name: "Đánh dấu tất cả đã đọc" }) as HTMLButtonElement).disabled).toBe(true);
});

it("opens a reauthorized record without inventing a read acknowledgement and keeps the inbox on return", async () => {
  api.readInbox.mockResolvedValue({ status: "success", data: { items: [{ ...row, canOpenRecord: true }], total: 1, unreadCount: 1 } });
  api.openInboxRecord.mockResolvedValue({ status: "success", data: { notificationId: "id", recordType: "WaterMeasurement", recordId: "record", zoneId: "zone", recordCode: null } });
  render(<InboxDialog onClose={vi.fn()} />); fireEvent.click(await screen.findByRole("button", { name: "Xem hồ sơ liên quan" }));
  await screen.findByRole("dialog", { name: "Hồ sơ liên quan" }); expect(api.openInboxRecord).toHaveBeenCalledWith("id"); expect(api.markInboxRead).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Về hộp thư" })); expect(screen.queryByRole("dialog", { name: "Hồ sơ liên quan" })).toBeNull(); expect(screen.getByText(row.title)).toBeTruthy();
});
it.each([403, 404])("keeps notifications and read state after an open error %s", async (httpStatus) => {
  api.readInbox.mockResolvedValue({ status: "success", data: { items: [{ ...row, canOpenRecord: true }], total: 1, unreadCount: 1 } });
  api.openInboxRecord.mockResolvedValue({ status: "error", httpStatus, uncertain: false });
  render(<InboxDialog onClose={vi.fn()} />); fireEvent.click(await screen.findByRole("button", { name: "Xem hồ sơ liên quan" }));
  await screen.findByRole("alert"); expect(screen.getByText(row.title)).toBeTruthy(); expect(api.markInboxRead).not.toHaveBeenCalled(); expect(api.push).not.toHaveBeenCalled();
});

it("navigates account records through the existing account deep link only after reauthorization", async () => {
  const accountId = "122bb318-a72e-49aa-a8d7-a6169f889007";
  api.readInbox.mockResolvedValue({ status: "success", data: { items: [{ ...row, canOpenRecord: true }], total: 1, unreadCount: 1 } });
  api.openInboxRecord.mockResolvedValue({ status: "success", data: { notificationId: "id", recordType: "Account", recordId: accountId, zoneId: null, recordCode: null } });
  const close = vi.fn(); render(<InboxDialog onClose={close} />); fireEvent.click(await screen.findByRole("button", { name: "Xem hồ sơ liên quan" }));
  await vi.waitFor(() => expect(api.push).toHaveBeenCalledWith(`/workspace/accounts?accountId=${accountId}`)); expect(close).toHaveBeenCalledOnce(); expect(api.markInboxRead).not.toHaveBeenCalled();
});
