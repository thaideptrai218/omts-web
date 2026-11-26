// @vitest-environment jsdom
import type { ReactNode } from "react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";

const state = vi.hoisted(() => ({ page: vi.fn(), lookups: vi.fn(), cycles: vi.fn(), push: vi.fn() }));
vi.mock("next/link", () => ({ default: ({ href, children, "aria-label": label }: { href: string; children: ReactNode; "aria-label"?: string }) => <a href={href} aria-label={label}>{children}</a> }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: state.push }) }));
vi.mock("@/features/rafts-api/raft-page-repository", () => ({ readRaftPage: state.page }));
vi.mock("@/features/operations/lookups", () => ({ loadOptions: state.lookups }));
vi.mock("@/features/cycles-api/repository", () => ({ readCycles: state.cycles }));
vi.mock("@/features/rafts-api/raft-create-dialog", () => ({
  RaftCreateDialog: ({ zoneId, zoneLabel, onCreated, onClose }: { zoneId: string; zoneLabel: string; onCreated(record: object): void; onClose(): void }) =>
    <div role="dialog" aria-label="Thêm bè nuôi"><p>{zoneLabel} / {zoneId}</p><button type="button" onClick={() => onCreated({})}>Lưu giả</button><button type="button" onClick={onClose}>Bỏ qua giả</button></div>,
}));
import { ZoneRaftsTab } from "./zone-rafts-tab";

const ZONE = "529ec3ce-af8f-42f7-a08f-4bab36ba7e63";
const guard = { dirty: { current: false }, pending: { current: false }, leave: async (next: () => void) => next(), dialog: null } as never;
const access = { edit: true, photoEdit: true, cycles: true, costs: true };
const item = (over: object) => ({ id: "00000000-0000-4000-8000-000000000001", zoneId: ZONE, code: "B02", size: "10 m x 8 m", laneCount: 4, statusId: 101, status: "In Use", currentCycle: null, ...over });
const result = (items: object[], over: object = {}) => ({ status: "success", data: { items, page: 1, pageSize: 10, total: items.length, ...over } });
const CYCLE = "00000000-0000-4000-8000-0000000000c1";
const mount = (over: object = {}) => render(<ZoneRaftsTab zoneId={ZONE} zoneLabel="V01 · Vùng 1" canCreate={false} raftAccess={access} guard={guard} {...over} />);
const lastQuery = () => state.page.mock.calls.at(-1)?.[0];

beforeEach(() => {
  state.page.mockResolvedValue(result([item({ currentCycle: { id: CYCLE, startDate: "2026-11-01" } }), item({ id: "00000000-0000-4000-8000-000000000002", code: "B01", laneCount: null, size: null, statusId: 102, status: "Discontinued" })]));
});
afterEach(() => { cleanup(); vi.clearAllMocks(); });

it("lists the rafts in one server-paged call with the open cycle, and reads neither every page nor the zone cycles", async () => {
  mount();
  expect(await screen.findByText("B02")).toBeTruthy();
  expect(screen.getAllByRole("columnheader").map(cell => cell.textContent)).toEqual(["Mã bè", "Kích thước", "Số làn", "Trạng thái", "Chu kỳ hiện tại"]);
  expect(state.page).toHaveBeenCalledTimes(1);
  expect(lastQuery()).toEqual({ zoneId: ZONE, statusId: "", search: "", page: 1, pageSize: 10 });
  expect(state.lookups).not.toHaveBeenCalled(); expect(state.cycles).not.toHaveBeenCalled();
  const first = within(screen.getByText("B02").closest("tr") as HTMLElement), second = within(screen.getByText("B01").closest("tr") as HTMLElement);
  expect(first.getByRole("link", { name: "Đang nuôi từ 01/11/2026" }).getAttribute("href")).toContain(`cycleId=${CYCLE}`);
  expect(first.getByText("Đang sử dụng")).toBeTruthy();
  expect(second.getByText("Chưa có chu kỳ")).toBeTruthy(); expect(second.getByText("Ngừng sử dụng")).toBeTruthy(); expect(second.getAllByText("—")).toHaveLength(2);
});

it("links a raft by its code, never by id, with the code on one line", async () => {
  mount();
  const link = await screen.findByRole("link", { name: "Mở hồ sơ bè B02" });
  expect(link.getAttribute("href")).toBe(`/farming/rafts?zoneId=${ZONE}&search=B02`);
  expect(link.getAttribute("href")).not.toContain("recordId");
  expect(link.closest("td")?.className).toContain("nowrap");
});

it("pages on the server and keeps the chosen page size", async () => {
  state.page.mockImplementation(async (query: { page: number; pageSize: number }) => result([item({ code: `B-P${query.page}` })], { page: query.page, pageSize: query.pageSize, total: 25 }));
  mount();
  await screen.findByText("B-P1");
  expect(screen.getByText("1–10 trong 25 bè")).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Trang sau" }));
  await screen.findByText("B-P2");
  expect(lastQuery()).toMatchObject({ page: 2, pageSize: 10 });
});

it("filters by status at once and by code after the user pauses, back on page 1", async () => {
  mount();
  await screen.findByText("B02");
  fireEvent.change(screen.getByLabelText("Trạng thái"), { target: { value: "101" } });
  await waitFor(() => expect(lastQuery()).toMatchObject({ statusId: "101", page: 1 }));
  fireEvent.change(screen.getByLabelText("Tìm theo mã bè"), { target: { value: " B0 " } });
  await waitFor(() => expect(lastQuery()).toMatchObject({ statusId: "101", search: "B0", page: 1 }));
  expect(state.page.mock.calls.filter(call => call[0].search === "B0")).toHaveLength(1);
});

it("starts on the code of a raft picked on the map and marks its row", async () => {
  state.page.mockResolvedValue(result([item({})]));
  mount({ focus: { id: "00000000-0000-4000-8000-000000000001", code: "B02" } });
  const row = (await screen.findByText("B02", { selector: "a" })).closest("tr") as HTMLElement;
  expect(lastQuery()).toMatchObject({ search: "B02" });
  expect(row.getAttribute("data-selected")).toBe("true");
});

it("has the open-list link on the left and Thêm bè on the right only with permission", async () => {
  const view = mount();
  await screen.findByText("B02");
  expect(screen.getByRole("link", { name: /Mở danh sách bè của vùng/ }).getAttribute("href")).toBe(`/farming/rafts?zoneId=${ZONE}`);
  expect(screen.queryByRole("button", { name: /Thêm bè/ })).toBeNull();
  view.rerender(<ZoneRaftsTab zoneId={ZONE} zoneLabel="V01 · Vùng 1" canCreate raftAccess={access} guard={guard} />);
  expect(screen.getByRole("button", { name: /Thêm bè/ })).toBeTruthy();
});

it("opens the raft create dialog for this zone and reloads the list after a save", async () => {
  mount({ canCreate: true });
  await screen.findByText("B02");
  fireEvent.click(screen.getByRole("button", { name: /Thêm bè/ }));
  expect(screen.getByText(`V01 · Vùng 1 / ${ZONE}`)).toBeTruthy();
  const before = state.page.mock.calls.length;
  fireEvent.click(screen.getByText("Lưu giả"));
  await waitFor(() => expect(state.page.mock.calls.length).toBeGreaterThan(before));
  expect(screen.queryByRole("dialog")).toBeNull();
});

it("hides the cycle column from an account that may not see cycles", async () => {
  mount({ raftAccess: { ...access, cycles: false } });
  await screen.findByText("B02");
  expect(screen.queryByRole("columnheader", { name: "Chu kỳ hiện tại" })).toBeNull();
});

it("says so when the zone has no raft and offers a retry on error", async () => {
  state.page.mockResolvedValue(result([]));
  const view = mount();
  await waitFor(() => expect(screen.queryByRole("status")).toBeNull());
  expect(screen.queryByRole("link", { name: /Mở hồ sơ bè/ })).toBeNull();
  view.unmount();
  state.page.mockResolvedValue({ status: "error", httpStatus: 503, uncertain: false });
  mount();
  fireEvent.click(await screen.findByRole("button", { name: "Tải lại" }));
  await waitFor(() => expect(state.page.mock.calls.length).toBeGreaterThan(2));
});
