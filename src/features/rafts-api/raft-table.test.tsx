// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";

const reads = vi.hoisted(() => vi.fn());
vi.mock("@/features/cycles-api/repository", () => ({ readCycles: reads }));
vi.mock("./raft-detail-panel", () => ({ RaftDetailPanel: ({ id, initialTab }: { id: string; initialTab?: string }) => <p>Chi tiết {id} · tab {initialTab ?? "mặc định"}</p> }));
import { RaftTable, raftColumns } from "./raft-table";
import { lanePhaseLabel, laneSummaryText } from "./raft-current-state";
import type { ZonedRaftRow } from "./raft-model";

const row = (id: string, code: string, laneSummary?: ZonedRaftRow["laneSummary"]): ZonedRaftRow => ({ id, code, statusId: 101, status: "In Use", laneCount: 10, zoneId: "z", zoneLabel: "Z · Vùng", laneSummary });
const access = { edit: true, photoEdit: true, cycles: true, costs: true };
const show = (rows: ZonedRaftRow[], over: { cycles?: boolean; expandedId?: string; initialTabOf?: string; initialTab?: string } = {}) => render(<RaftTable rows={rows} visible={raftColumns.map(column => column.key)} sort={{ key: "code", direction: "asc" }} onSort={vi.fn()} expandedId={over.expandedId} onToggle={vi.fn()}
  scopeOf={item => ({ zoneId: item.zoneId, zoneLabel: item.zoneLabel, access: { ...access, cycles: over.cycles ?? true } })} guard={{ dirty: { current: false }, pending: { current: false }, leave: async (apply: () => void) => apply(), dialog: null } as never}
  initialTabOf={over.initialTabOf} initialTab={over.initialTab} onChanged={vi.fn()} />);
afterEach(() => { cleanup(); vi.clearAllMocks(); });

describe("raft list lane column", () => {
  it("reads the lane counts of each row from the list response and makes no read of its own", () => {
    show([row("a", "B1", { farming: 6, notSeeded: 3, harvested: 1, damaged: 0, outOfService: 0 }), row("b", "B2", { farming: 0, notSeeded: 8, harvested: 0, damaged: 0, outOfService: 0 }), row("c", "B3")]);
    const [first, second, third] = screen.getAllByRole("row").slice(1);
    expect(within(first).getByText("6/10 làn đang nuôi")).toBeTruthy();
    expect(within(first).getByText("1 đã thu · 3 chưa thả")).toBeTruthy();
    expect(within(first).getByText("Đang nuôi")).toBeTruthy();
    expect(within(second).getByText("0/8 làn đang nuôi")).toBeTruthy();
    expect(within(second).getByText("8 chưa thả")).toBeTruthy();
    expect(within(second).getByText("Chưa nuôi")).toBeTruthy();
    // A backend that does not send laneSummary yet leaves a dash instead of an invented number.
    expect(within(third).queryByText(/làn đang nuôi/)).toBeNull();
    expect(reads).not.toHaveBeenCalled();
  });
  it("shows a dash, with the reason, where the account may not read cycles", () => {
    show([row("a", "B1", { farming: 6, notSeeded: 3, harvested: 1, damaged: 0, outOfService: 0 })], { cycles: false });
    expect(screen.queryByText(/làn đang nuôi/)).toBeNull();
    expect(screen.getAllByTitle("Không có quyền xem chu kỳ và tiến độ làn").length).toBe(2);
  });
  it("opens the linked raft on the tab the link asked for and every other raft on the default", () => {
    show([row("a", "B1"), row("b", "B2")], { expandedId: "a", initialTabOf: "a", initialTab: "cycles" });
    expect(screen.getByText("Chi tiết a · tab cycles")).toBeTruthy();
    cleanup();
    show([row("a", "B1"), row("b", "B2")], { expandedId: "b", initialTabOf: "a", initialTab: "cycles" });
    expect(screen.getByText("Chi tiết b · tab mặc định")).toBeTruthy();
  });
  it("words the lane summary and the phase", () => {
    expect(laneSummaryText({ farming: 6, notSeeded: 2, harvested: 1, damaged: 1, outOfService: 0 })).toEqual({ text: "6/10 làn đang nuôi", detail: "1 đã thu · 1 hỏng · 2 chưa thả" });
    expect(lanePhaseLabel({ farming: 0, notSeeded: 0, harvested: 4, damaged: 0, outOfService: 0 })).toEqual({ label: "Đã thu xong", active: false });
  });
});
