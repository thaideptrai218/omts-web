// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { ToastProvider } from "@/components/ui/toast-provider";

const state = vi.hoisted(() => ({ params: "" }));
const zoneId = "00000000-0000-4000-8000-000000000001", raftA = "00000000-0000-4000-8000-0000000000a1", raftB = "00000000-0000-4000-8000-0000000000a2";
const zoneRow = { id: zoneId, code: "Z1", name: "Vùng A", location: null, area: null, statusId: 101, status: "In Use", inUseRaftCount: 2, licenseState: null };
const rafts = (extra: object[] = []) => [{ id: raftA, code: "B1-01", statusId: 101, status: "In Use", laneCount: 10, laneSummary: { farming: 6, notSeeded: 4, harvested: 0, damaged: 0, outOfService: 0 } },
  { id: raftB, code: "B1-02", statusId: 101, status: "In Use", laneCount: 4 }, ...extra];
vi.mock("next/navigation", () => ({ useSearchParams: () => new URLSearchParams(state.params) }));
vi.mock("@/features/operations/lookups", () => ({ loadOptions: async (kind: string) => ({ status: "success", data: kind === "zones" ? [zoneRow] : rafts() }) }));
vi.mock("@/features/api-workspace/api-workspace-shell", () => ({ useApiWorkspace: () => ({ identity: { subjectType: "CooperativeOwner" }, permissions: { functionPermissions: [] } }) }));
vi.mock("./raft-detail-panel", () => ({ RaftDetailPanel: ({ id, initialTab }: { id: string; initialTab?: string }) => <section aria-label="Chi tiết bè nuôi">Bè {id} · tab {initialTab ?? "mặc định"}</section> }));
vi.mock("@/features/cycles-api/repository", () => ({ readCycles: vi.fn() }));
import { RaftScreen } from "./raft-screen";

afterEach(() => { cleanup(); state.params = ""; vi.clearAllMocks(); });
const show = () => render(<ToastProvider><RaftScreen /></ToastProvider>);

describe("raft screen", () => {
  it("lists the lane counts of the rows from the list response alone", async () => {
    state.params = new URLSearchParams({ zoneId }).toString();
    show();
    expect(await screen.findByText("6/10 làn đang nuôi")).toBeTruthy();
    expect(screen.queryByRole("region", { name: "Chi tiết bè nuôi" })).toBeNull();
  });
  it("opens the raft a code link names, on the tab the link asked for", async () => {
    state.params = new URLSearchParams({ zoneId, search: "b1-01", tab: "cycles" }).toString();
    show();
    expect((await screen.findByRole("region", { name: "Chi tiết bè nuôi" })).textContent).toBe(`Bè ${raftA} · tab cycles`);
  });
  it("opens the raft a link names by id with its tab", async () => {
    state.params = new URLSearchParams({ zoneId, recordId: raftB, tab: "logs" }).toString();
    show();
    expect((await screen.findByRole("region", { name: "Chi tiết bè nuôi" })).textContent).toBe(`Bè ${raftB} · tab logs`);
  });
  it("opens nothing when the code matches no raft, and nothing when several rafts could match", async () => {
    state.params = new URLSearchParams({ zoneId, search: "B9", tab: "cycles" }).toString();
    show();
    await screen.findByText("Không có bè phù hợp bộ lọc.");
    expect(screen.queryByRole("region", { name: "Chi tiết bè nuôi" })).toBeNull();
    cleanup();
    state.params = new URLSearchParams({ zoneId, search: "B1" }).toString();
    show();
    await screen.findByText("B1-02");
    expect(screen.queryByRole("region", { name: "Chi tiết bè nuôi" })).toBeNull();
  });
  it("tells where to start a cycle from a nursery batch", async () => {
    state.params = new URLSearchParams({ zoneId, nurseryBatch: "b1" }).toString();
    show();
    expect(await screen.findByText(/Mở bè cần thả giống/)).toBeTruthy();
  });
});
