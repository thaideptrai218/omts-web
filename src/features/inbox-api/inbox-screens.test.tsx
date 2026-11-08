// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
const api = vi.hoisted(() => ({ readInbox: vi.fn(), markInboxRead: vi.fn(), openInboxRecord: vi.fn(), push: vi.fn() }));
vi.mock("./repository", () => api);
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: api.push }) }));
import { InboxListScreen } from "./inbox-screens";
afterEach(() => { cleanup(); vi.clearAllMocks(); });
it("expands in context without navigating or silently marking read", async () => {
  const row = { id: "fixture-notification", type: "PURCHASE_RECEIPT_COMPLETED", title: "Phiếu nhập hoàn thành", body: "Hoàn thành phiếu PN01.", relatedRecordType: "PurchaseReceipt", relatedRecordCode: "PN01", createdAt: "2026-11-06T01:00:00Z", readAt: null, isMandatory: false, canOpenRecord: false };
  api.readInbox.mockResolvedValue({ status: "success", data: { items: [row], total: 21, unreadCount: 1 } });
  api.markInboxRead.mockResolvedValue({ status: "success", data: { saved: true } });
  render(<InboxListScreen initialPage={2} />);
  fireEvent.click(await screen.findByRole("button", { name: /Hoàn thành phiếu PN01/ }));
  expect(screen.getByRole("heading", { name: "Phiếu nhập hoàn thành" })).toBeTruthy();
  expect(api.markInboxRead).not.toHaveBeenCalled(); expect(api.push).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Đánh dấu đã đọc" }));
  await waitFor(() => expect(api.readInbox).toHaveBeenCalledTimes(2));
  expect(api.markInboxRead).toHaveBeenCalledWith({ action: "read", id: row.id });
  expect(api.readInbox.mock.calls.at(-1)?.[0]).toBe(2);
});
