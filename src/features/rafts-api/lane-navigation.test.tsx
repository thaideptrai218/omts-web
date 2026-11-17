// @vitest-environment jsdom
import { useEffect, useState } from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { ToastProvider } from "@/components/ui/toast-provider";
import { raftFixture } from "@/features/farming-api/fixtures";
const state = vi.hoisted(() => ({ read: vi.fn(), history: vi.fn(), cycle: vi.fn() }));
vi.mock("@/features/operations/repository", () => ({ createOperationsRepository: () => ({ read: state.read }) }));
vi.mock("./lane-incident-repository", () => ({ laneIncidentRepository: { history: state.history, cycle: state.cycle } }));
vi.mock("@/features/api-workspace/api-workspace-shell", () => ({ useApiWorkspace: () => ({ identity: { subjectType: "CooperativeOwner" }, permissions: { functionPermissions: [] } }) }));
vi.mock("@/components/ui/dialog", () => ({ Dialog: ({ children }: { children: React.ReactNode }) => <div role="dialog">{children}</div> }));
vi.mock("./lane-incident-form", () => ({ LaneIncidentForm: ({ onStateChange }: { onStateChange?(value: { dirty: boolean; pending: boolean }): void }) => {
  const [pending, setPending] = useState(false);
  useEffect(() => { onStateChange?.({ dirty: true, pending }); }, [pending, onStateChange]);
  useEffect(() => () => onStateChange?.({ dirty: false, pending: false }), [onStateChange]);
  return <div aria-label="Bản nháp sự cố"><button type="button" onClick={() => setPending(true)}>Bắt đầu lưu</button><button type="button" onClick={() => setPending(false)}>Kết thúc lưu</button></div>;
} }));
import { RaftPhotoTab } from "./raft-photo-tab";
import { useUnsavedGuard } from "@/features/farming-management/use-unsaved-guard";
afterEach(() => { cleanup(); vi.clearAllMocks(); });
function Frame() {
  const guard = useUnsavedGuard(), [closed, setClosed] = useState(false);
  const [id] = useState("30000000-0000-4000-8000-000000000001");
  return <ToastProvider>{guard.dialog}{!closed && <RaftPhotoTab raftId={id} canEdit dirtyRef={guard.dirty} pendingRef={guard.pending} />}<button type="button" onClick={() => void guard.leave(() => setClosed(true))}>Đổi tab</button></ToastProvider>;
}
it("keeps the incident mounted during pending saves and confirms draft discard before switching row or tab", async () => {
  const raft = raftFixture();
  const lanes = [1, 2].map(n => ({ ...raft.lanes[0], id: `40000000-0000-4000-8000-00000000000${n}`, laneNumber: n, isDamaged: false }));
  state.read.mockResolvedValue({ status: "success", data: { ...raft, photos: [], lanes } });
  state.history.mockResolvedValue({ status: "success", data: { incidents: [] } });
  state.cycle.mockResolvedValue({ status: "success", data: { lanes: [], cycle: null } });
  render(<Frame />);
  fireEvent.click(await screen.findByRole("button", { name: /Làn 1/ }));
  // jsdom never opens a native popover, so the lane detail popover is display:none and only reachable with hidden roles.
  fireEvent.click(await screen.findByRole("button", { name: "Báo hỏng", hidden: true }));
  fireEvent.click(screen.getByRole("button", { name: "Bắt đầu lưu", hidden: true }));
  fireEvent.click(screen.getByRole("button", { name: /Làn 2/ }));
  fireEvent.click(screen.getByRole("button", { name: "Đổi tab" }));
  expect(screen.getByLabelText("Bản nháp sự cố")).toBeTruthy();
  expect(screen.queryByRole("button", { name: "Đồng ý" })).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Kết thúc lưu", hidden: true }));
  fireEvent.click(screen.getByRole("button", { name: /Làn 2/ }));
  fireEvent.click(await screen.findByRole("button", { name: "Quay lại" }));
  expect(screen.getByLabelText("Bản nháp sự cố")).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Đổi tab" }));
  fireEvent.click(await screen.findByRole("button", { name: "Đồng ý" }));
  await waitFor(() => expect(screen.queryByLabelText("Bản nháp sự cố")).toBeNull());
});
