// @vitest-environment jsdom
import type { ReactNode } from "react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";

const state = vi.hoisted(() => ({ read: vi.fn() }));
vi.mock("next/link", () => ({ default: ({ href, children, ...rest }: { href: string; children: ReactNode }) => <a href={href} {...rest}>{children}</a> }));
vi.mock("@/features/operations/repository", () => ({ createOperationsRepository: () => ({ read: state.read }) }));
vi.mock("@/features/operations/water-new-measurement-dialog", () => ({
  NewMeasurement: ({ zoneId, zoneName, onSaved, onClose }: { zoneId: string; zoneName: string; onSaved(): void; onClose(): void }) =>
    <div role="dialog" aria-label="Ghi phép đo"><p>{zoneName} / {zoneId}</p><button type="button" onClick={onSaved}>Lưu giả</button><button type="button" onClick={onClose}>Bỏ qua giả</button></div>,
}));
import { ZoneWaterTab } from "./zone-water-tab";

const ZONE = "529ec3ce-af8f-42f7-a08f-4bab36ba7e63";
const thresholds = { phMin: 7.51, phMax: 8.5, salinityMin: 18, salinityMax: 32, temperatureMin: 10, temperatureMax: 32 };
const row = (over: object) => ({ id: "r1", measuredAt: "2026-11-10T06:40:00+07:00", raftId: "raft", raftCode: "B1-02", ph: 7.8, salinity: 20, temperature: 28, status: "Active", statusCode: "ACTIVE", alertState: "Normal", violatedValues: null, measuredBy: null, thresholdsUsed: thresholds, valuesOutside: [], voidReason: null, ...over });
const page = (items: object[], over: object = {}) => ({ status: "success", data: { items, page: 1, pageSize: 10, total: items.length, ...over } });
const limitsResult = { status: "success", data: { zoneId: ZONE, zoneCode: "Z1", zoneName: "Vùng 1", zoneStatus: "In Use", thresholds } };
const outsidePh = { indicator: "pH", value: 9.1, unit: null, direction: "High", min: 7.51, max: 8.5 };

beforeEach(() => {
  state.read.mockImplementation(async (action: string) => action === "thresholds"
    ? limitsResult
    : page([row({}), row({ id: "r2", raftCode: "B2", ph: 9.1, valuesOutside: [outsidePh] }), row({ id: "r3", raftCode: "B3", alertState: "Voided", statusCode: "VOIDED", ph: 3, valuesOutside: [{ ...outsidePh, value: 3, direction: "Low" }] })]));
});
afterEach(() => { cleanup(); vi.clearAllMocks(); });
const listCalls = () => state.read.mock.calls.filter(call => call[0] === "list");

it("shows the thresholds on one line and one table with date-first times and no GUID in the raft link", async () => {
  render(<ZoneWaterTab zoneId={ZONE} zoneName="Vùng 1" canCreate={false} />);
  expect(await screen.findByText(/pH 7,51–8,5 · Độ mặn 18–32 ‰ · Nhiệt độ 10–32 °C/)).toBeTruthy();
  expect(screen.getAllByRole("columnheader").map(cell => cell.textContent)).toEqual(["Thời điểm", "Bè", "pH", "Độ mặn (‰)", "Nhiệt độ (°C)", "Cảnh báo"]);
  expect(screen.getAllByText("10/11/2026 06:40").length).toBe(3);
  const raft = screen.getByRole("link", { name: "B1-02" });
  expect(raft.getAttribute("href")).toBe(`/farming/rafts?zoneId=${ZONE}&search=B1-02`);
  expect(raft.getAttribute("href")).not.toContain("recordId");
  expect(state.read).toHaveBeenCalledWith("list", { zoneId: ZONE, page: "1", pageSize: "10" }, expect.anything(), expect.anything());
});

it("highlights only values outside their thresholds and marks voided rows without highlighting", async () => {
  render(<ZoneWaterTab zoneId={ZONE} zoneName="Vùng 1" canCreate={false} />);
  await screen.findByText("B2");
  const cells = (code: string) => within(screen.getByText(code).closest("tr") as HTMLElement).getAllByRole("cell");
  expect(cells("B2")[2].className).toContain("outside");
  expect(cells("B2")[3].className).not.toContain("outside");
  expect(within(cells("B2")[5]).getByText("pH")).toBeTruthy();
  expect(cells("B3")[2].className).not.toContain("outside");
  expect(within(cells("B3")[5]).getByText("Đã hủy")).toBeTruthy();
});

it("pages on the server", async () => {
  state.read.mockImplementation(async (action: string, query: Record<string, string>) => action === "thresholds"
    ? limitsResult
    : page([row({ id: `p${query.page}`, raftCode: `B-P${query.page}` })], { page: Number(query.page), pageSize: Number(query.pageSize), total: 25 }));
  render(<ZoneWaterTab zoneId={ZONE} zoneName="Vùng 1" canCreate={false} />);
  await screen.findByText("B-P1");
  expect(screen.getByText("1–10 trong 25 phép đo")).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Trang sau" }));
  await screen.findByText("B-P2");
  expect(listCalls().at(-1)?.[1]).toEqual({ zoneId: ZONE, page: "2", pageSize: "10" });
});

it("offers Đo nhanh only with permission and opens the measurement dialog for this zone, then reloads the list", async () => {
  const view = render(<ZoneWaterTab zoneId={ZONE} zoneName="Vùng 1" canCreate={false} />);
  await screen.findByText("B2");
  expect(screen.queryByRole("button", { name: /Đo nhanh/ })).toBeNull();
  expect(screen.getByRole("link", { name: /Mở theo dõi chất lượng nước/ }).getAttribute("href")).toBe(`/operations/water?zoneId=${ZONE}`);
  view.rerender(<ZoneWaterTab zoneId={ZONE} zoneName="Vùng 1" canCreate />);
  fireEvent.click(screen.getByRole("button", { name: /Đo nhanh/ }));
  expect(screen.getByText(`Vùng 1 / ${ZONE}`)).toBeTruthy();
  const before = listCalls().length;
  fireEvent.click(screen.getByText("Lưu giả"));
  await waitFor(() => expect(listCalls().length).toBeGreaterThan(before));
  expect(screen.queryByRole("dialog")).toBeNull();
});

it("says so when the zone has no measurement and offers a retry on error", async () => {
  state.read.mockImplementation(async (action: string) => action === "thresholds" ? limitsResult : page([]));
  render(<ZoneWaterTab zoneId={ZONE} zoneName="Vùng 1" canCreate={false} />);
  expect(await screen.findByText("Không có dữ liệu phù hợp.")).toBeTruthy();
  cleanup();
  state.read.mockImplementation(async (action: string) => action === "thresholds" ? limitsResult : { status: "error", httpStatus: 500, uncertain: false });
  render(<ZoneWaterTab zoneId={ZONE} zoneName="Vùng 1" canCreate={false} />);
  expect(await screen.findByRole("button", { name: "Tải lại" })).toBeTruthy();
});
