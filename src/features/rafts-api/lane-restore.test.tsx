// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { ToastProvider } from "@/components/ui/toast-provider";
const api = vi.hoisted(() => ({ history: vi.fn(), save: vi.fn(), cycle: vi.fn(), photo: vi.fn() }));
vi.mock("./lane-incident-repository", () => ({ laneIncidentRepository: api }));
vi.mock("@/features/input-items/repository", () => ({ inputRepository: { all: vi.fn().mockResolvedValue({ status: "success", data: [] }) } }));
vi.mock("@/components/ui/dialog", () => ({ Dialog: ({ children }: { children: import("react").ReactNode }) => <div role="dialog">{children}</div> }));
import { LaneIncidentForm } from "./lane-incident-form";
import { restoreValues, repairValues } from "./lane-incident-contracts";

const id = "00000000-0000-4000-8000-000000000001";
const props = { action: "restore" as const, raftId: id, raftCode: "B1", zoneId: id, laneNumber: 2, rowVersion: "v1", hasSeed: false, onClose: vi.fn(), onSaved: vi.fn() };
beforeEach(() => { api.save.mockResolvedValue({ status: "success", data: { incident: { id, laneNumber: 2, kind: "Restored", occurredAt: "2026-11-12T10:00:00+07:00" } } }); });
afterEach(() => { cleanup(); vi.clearAllMocks(); });

it("restores service with no reason and no materials after an explicit confirmation", async () => {
  render(<ToastProvider><LaneIncidentForm {...props} /></ToastProvider>);
  fireEvent.click(screen.getByRole("button", { name: "Lưu" }));
  fireEvent.click(await screen.findByRole("button", { name: "Đồng ý" }));
  await waitFor(() => expect(api.save).toHaveBeenCalledWith("restore", { id, zoneId: id, laneNumber: 2 }, { rowVersion: "v1" }));
});
it("shows the backend refusal while a cycle still holds seed on the lane", async () => {
  api.save.mockResolvedValue({ status: "error", httpStatus: 409, code: "MSG-GEN-09", problem: { message: "Làn còn giống trong chu kỳ đang mở." }, uncertain: false });
  render(<ToastProvider><LaneIncidentForm {...props} /></ToastProvider>);
  fireEvent.click(screen.getByRole("button", { name: "Lưu" }));
  fireEvent.click(await screen.findByRole("button", { name: "Đồng ý" }));
  expect((await screen.findByRole("alert")).textContent).toContain("Làn còn giống");
});
it("repair needs no reason when no material is used, and the schemas agree", async () => {
  expect(repairValues.safeParse({ rowVersion: "v" }).success).toBe(true);
  expect(restoreValues.safeParse({ rowVersion: "v", materials: [{ itemId: id, quantity: 2, unit: "m" }] }).success).toBe(true);
  expect(restoreValues.safeParse({ rowVersion: "v", materials: [] }).success).toBe(false);
  render(<ToastProvider><LaneIncidentForm {...props} action="repair" /></ToastProvider>);
  expect(screen.getByLabelText("Nội dung sửa (tùy chọn)")).toBeTruthy();
  fireEvent.click(await screen.findByRole("button", { name: "Lưu" }));
  await waitFor(() => expect(api.save).toHaveBeenCalledWith("repair", expect.anything(), { rowVersion: "v1" }));
});
