// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

const state = vi.hoisted(() => ({ mutate: vi.fn(), notify: vi.fn() }));
vi.mock("@/features/api-workspace/workspace-repository", () => ({ createWorkspaceRepository: () => ({ mutate: state.mutate, proposal: () => new Promise(() => undefined) }) }));
vi.mock("@/components/ui/toast-provider", () => ({ useOptionalToast: () => ({ notify: state.notify }), useToast: () => ({ notify: state.notify }) }));
vi.mock("./raft-form-fields", () => ({ RaftFormFields: () => null }));
vi.mock("./raft-model", async importOriginal => ({ ...await importOriginal<typeof import("./raft-model")>(), validateRaftDraft: () => ({}), raftBody: () => ({ code: "B01" }) }));
import { RaftCreateDialog } from "./raft-create-dialog";

beforeEach(() => {
  HTMLDialogElement.prototype.showModal = function () { this.open = true; };
  HTMLDialogElement.prototype.close = function () { this.open = false; };
});
afterEach(() => { cleanup(); vi.clearAllMocks(); });
const save = async (answer: object) => {
  state.mutate.mockResolvedValue({ status: "success", data: answer });
  const onCreated = vi.fn();
  render(<RaftCreateDialog zoneId="z1" zoneLabel="V01 · Vùng 1" onClose={vi.fn()} onCreated={onCreated} />);
  fireEvent.click(screen.getByRole("button", { name: "Lưu" }));
  await waitFor(() => expect(onCreated).toHaveBeenCalled());
};

it("shows a raft pinned outside the zone boundary as a warning toast and still saves", async () => {
  await save({ id: "r1", code: "B01", warnings: [{ code: "RAFT_OUTSIDE_ZONE_BOUNDARY", details: { distanceM: 42 } }] });
  expect(state.notify).toHaveBeenCalledWith({ tone: "warning", title: "Bè nằm ngoài ranh giới vùng 42 m. Hãy kiểm tra lại vị trí bè." });
});

it("shows no toast when the save carries no warning", async () => {
  await save({ id: "r1", code: "B01" });
  expect(state.notify).not.toHaveBeenCalled();
});
