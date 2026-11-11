// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { ToastProvider } from "@/components/ui/toast-provider";
const state = vi.hoisted(() => ({ request: vi.fn() }));
vi.mock("./log-repository", async importOriginal => ({ ...await importOriginal<typeof import("./log-repository")>(), logRequest: state.request }));
import { CycleLogsTab } from "./cycle-logs-tab";
const log = { id: "00000000-0000-4000-8000-000000000001", cycleId: "00000000-0000-4000-8000-000000000002", raftId: "00000000-0000-4000-8000-000000000003", raftCode: "B1", visitDate: "2026-11-01", notes: "Chăm sóc bè", photos: [{ key: "photo", url: "https://example.test/photo.jpg", sortOrder: 1 }], recordedByAccountId: "00000000-0000-4000-8000-000000000004", recordedByName: "Người ghi", recordedAt: "2026-11-01T08:00:00+07:00", canCorrect: true, rowVersion: "ONE" };
afterEach(() => { cleanup(); vi.clearAllMocks(); });
it("opens the log before offering actions and switches to an inline form without submitting", async () => {
  state.request.mockImplementation(async action => ({ status: "success", data: action === "list" ? [log] : log }));
  render(<ToastProvider><CycleLogsTab cycleId={log.cycleId} openCycle canCreate canEdit /></ToastProvider>);
  await screen.findByRole("button", { name: "01/11/2026" });
  expect(screen.queryByRole("button", { name: "Chỉnh sửa" })).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "01/11/2026" }));
  const edit = screen.getByRole("button", { name: "Chỉnh sửa" });
  expect(edit.getAttribute("type")).toBe("button");
  fireEvent.click(edit);
  expect(screen.queryByRole("dialog")).toBeNull();
  const save = screen.getByRole("button", { name: "Lưu" });
  expect(save).not.toBe(edit);
  expect(save.getAttribute("type")).toBe("submit");
  expect(state.request.mock.calls.filter(([action]) => action === "correct")).toHaveLength(0);
  fireEvent.change(screen.getByLabelText("Lý do sửa"), { target: { value: "Sửa ghi chú" } });
  fireEvent.click(save);
  await waitFor(() => expect(state.request.mock.calls.filter(([action]) => action === "correct")).toHaveLength(1));
  expect(await screen.findByText("Đã lưu nhật ký ngày 01/11/2026.")).toBeTruthy();
});
