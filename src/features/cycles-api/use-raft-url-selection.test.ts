// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CycleRow } from "./cycle-model";

const state = vi.hoisted(() => ({ query: "" }));
vi.mock("next/navigation", () => ({ useSearchParams: () => new URLSearchParams(state.query) }));
import { useRaftUrlSelection } from "./use-raft-url-selection";

const row = { raftId: "raft-1", cycle: { id: "cycle-1" } } as unknown as CycleRow;

describe("useRaftUrlSelection", () => {
  beforeEach(() => { state.query = ""; window.history.replaceState(null, "", "/farming/cycles?search=B1"); });

  it("writes zone, raft, cycle and tab of the opened row, keeping other parameters", () => {
    const { result } = renderHook(() => useRaftUrlSelection("journey"));
    act(() => result.current.select("zone-1", row));
    const query = new URLSearchParams(window.location.search);
    expect(Object.fromEntries(query)).toEqual({ search: "B1", zoneId: "zone-1", raftId: "raft-1", cycleId: "cycle-1", tab: "journey" });
  });

  it("removes raft, cycle and tab on close but keeps the zone", () => {
    const { result } = renderHook(() => useRaftUrlSelection("journey"));
    act(() => result.current.select("zone-1", row));
    act(() => result.current.select("zone-1"));
    expect(Object.fromEntries(new URLSearchParams(window.location.search))).toEqual({ search: "B1", zoneId: "zone-1" });
  });

  it("re-creates the screen (epoch) for an outside link but not for its own write", () => {
    const { result, rerender } = renderHook(() => useRaftUrlSelection());
    act(() => result.current.select("zone-1", row));
    state.query = "raftId=raft-1&cycleId=cycle-1"; rerender();
    expect(result.current.epoch).toBe(0);
    state.query = "raftId=raft-2&cycleId=cycle-2"; rerender();
    expect(result.current.epoch).toBe(1);
  });
});
