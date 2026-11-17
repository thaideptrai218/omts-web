// @vitest-environment jsdom
import { cleanup, render, screen, fireEvent } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { ToastProvider } from "@/components/ui/toast-provider";
const state = vi.hoisted(() => ({ detail: vi.fn(), leave: vi.fn() }));
vi.mock("./workspace-repository", () => ({ createWorkspaceRepository: () => ({ detail: state.detail }) }));
vi.mock("@/features/farming-management/use-unsaved-guard", () => ({ useUnsavedGuard: () => ({ dialog: null, dirty: { current: false }, leave: state.leave }) }));
vi.mock("@/features/rafts-api/raft-create-dialog", () => ({ RaftCreateDialog: ({ zoneLabel }: { zoneLabel: string }) => <div role="dialog">Thêm bè {zoneLabel}</div> }));
vi.mock("@/features/rafts-api/raft-detail-panel", () => ({ RaftDetailPanel: () => <section aria-label="Chi tiết bè nuôi">Thông tin bè</section> }));
import { RaftResourceEditor } from "./raft-resource-editor";
import type { ApiRecord } from "./workspace-repository";
afterEach(() => { cleanup(); vi.clearAllMocks(); });
const props = { zoneId: "z", zones: [{ id: "z", code: "V01" }] as ApiRecord[], canEdit: true, onClose: vi.fn(), onSaved: vi.fn() };
it("keeps creation in a dialog with the selected zone", () => {
  render(<ToastProvider><RaftResourceEditor {...props} record={null} /></ToastProvider>);
  expect(screen.getByRole("dialog").textContent).toContain("V01");
});
it("opens existing rafts in place and guards collapse without submitting", () => {
  render(<ToastProvider><RaftResourceEditor {...props} record={{ id: "r" } as ApiRecord} /></ToastProvider>);
  expect(screen.queryByRole("dialog")).toBeNull();
  expect(screen.getByRole("region", { name: "Chi tiết bè nuôi" })).toBeTruthy();
  const close = screen.getByRole("button", { name: "Thu gọn" });
  expect(close.getAttribute("type")).toBe("button");
  fireEvent.click(close);
  expect(state.leave).toHaveBeenCalledWith(props.onClose);
  expect(state.detail).not.toHaveBeenCalled();
});
