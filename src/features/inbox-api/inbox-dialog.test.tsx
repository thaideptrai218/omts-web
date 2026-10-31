// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
const api = vi.hoisted(() => ({ readInbox: vi.fn(), markInboxRead: vi.fn() }));
vi.mock("./repository", () => api);
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
