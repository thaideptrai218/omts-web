// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, waitFor } from "@testing-library/react";

const nav = vi.hoisted(() => ({ replace: vi.fn(), query: "" }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: nav.replace }), useSearchParams: () => new URLSearchParams(nav.query) }));
import { CyclesRedirect, cycleRedirectTarget } from "./cycles-redirect";

const zone = "00000000-0000-4000-8000-000000000001", raft = "00000000-0000-4000-8000-0000000000a1", cycle = "00000000-0000-4000-8000-0000000000c1";
afterEach(() => { cleanup(); vi.clearAllMocks(); nav.query = ""; });

describe("/farming/cycles forwards to the raft screen", () => {
  it("opens the raft of a cycle deep link on its Chu kỳ nuôi tab and drops the cycle id", () => {
    expect(cycleRedirectTarget(new URLSearchParams({ zoneId: zone, raftId: raft, cycleId: cycle, tab: "journey" }))).toBe(`/farming/rafts?zoneId=${zone}&recordId=${raft}&tab=cycles`);
    expect(cycleRedirectTarget(new URLSearchParams({ zoneId: zone, raftId: raft, cycleId: cycle }))).toBe(`/farming/rafts?zoneId=${zone}&recordId=${raft}&tab=cycles`);
  });
  it("keeps a raft code search, the care log tab and the nursery batch of Treo lên bè", () => {
    expect(cycleRedirectTarget(new URLSearchParams({ search: "B1-01", tab: "logs" }))).toBe("/farming/rafts?search=B1-01&tab=logs");
    expect(cycleRedirectTarget(new URLSearchParams({ nurseryBatch: "b 1" }))).toBe("/farming/rafts?tab=cycles&nurseryBatch=b%201");
    expect(cycleRedirectTarget(new URLSearchParams())).toBe("/farming/rafts?tab=cycles");
  });
  it("replaces the address on mount", async () => {
    nav.query = new URLSearchParams({ zoneId: zone, raftId: raft, cycleId: cycle }).toString();
    render(<CyclesRedirect />);
    await waitFor(() => expect(nav.replace).toHaveBeenCalledWith(`/farming/rafts?zoneId=${zone}&recordId=${raft}&tab=cycles`));
  });
});
