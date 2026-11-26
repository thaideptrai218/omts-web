// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render as baseRender, screen, waitFor } from "@testing-library/react";
import { ToastProvider } from "@/components/ui/toast-provider";
import type { ReactNode } from "react";
const mocks = vi.hoisted(() => ({ options: vi.fn(), read: vi.fn(), write: vi.fn(), upload: vi.fn(), download: vi.fn() }));
vi.mock("./repository", () => ({ createOperationsRepository: () => mocks }));
vi.mock("./lookups", () => ({ loadOptions: (...args: unknown[]) => mocks.options(...args) }));
vi.mock("@/features/api-workspace/api-workspace-shell", () => ({ useApiWorkspace: () => ({ identity: { subjectType: "CooperativeOwner" }, permissions: { functionPermissions: [] } }) }));
vi.mock("@/components/ui/dialog", () => ({ Dialog: ({ title, children }: { title: string; children: ReactNode }) => <div role="dialog" aria-label={title}>{children}</div> }));
import { WaterScreen } from "./water-screen";
import { receiptFixture } from "./__tests__/fixtures";
const render = (ui: ReactNode) => baseRender(<ToastProvider>{ui}</ToastProvider>);

const unavailable = { status: "error", httpStatus: 503, uncertain: false };
const record = receiptFixture();
const zones = [{ ...record.zone, statusId: 101 }];
beforeEach(() => {
  vi.resetAllMocks();
  mocks.options.mockResolvedValue({ status: "success", data: [] });
  const history = { status: "success", data: { items: [], total: 0, page: 1, pageSize: 100 } };
  // Tổng quan vùng nước (mảng rỗng) khác hợp đồng lịch sử đo; các lần đọc khác giữ nguyên.
  const chart = { status: "success", data: { zoneId: record.zone.id, from: "2025-11-27", to: "2026-11-27", thresholds: {}, points: [] } };
  mocks.read.mockImplementation((action: string) => Promise.resolve(action === "zones-overview" ? { status: "success", data: [] } : action === "chart" ? chart : history));
});
afterEach(cleanup);

describe("manual lookup recovery without writing", () => {
  it("recovers the zone picker when water zone loading fails before any zone can be selected", async () => {
    mocks.options.mockResolvedValueOnce(unavailable).mockResolvedValue({ status: "success", data: zones });
    render(<WaterScreen />);
    fireEvent.click(await screen.findByRole("button", { name: "Tải lại danh sách vùng" }));
    await screen.findByRole("option", { name: record.zone.name });
    // The screen opens on the first In Use zone and reads its measurements; there is no all-zones overview.
    await waitFor(() => expect((screen.getByRole("combobox", { name: "Vùng nuôi" }) as HTMLSelectElement).value).toBe(record.zone.id));
    expect(mocks.read).toHaveBeenCalledWith("list", expect.objectContaining({ zoneId: record.zone.id }), expect.anything(), expect.anything());
    expect(mocks.options).toHaveBeenCalledTimes(2); expect(mocks.write).not.toHaveBeenCalled();
  });
});
