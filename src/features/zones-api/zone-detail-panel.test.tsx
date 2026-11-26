// @vitest-environment jsdom
import type { ReactNode } from "react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

const state = vi.hoisted(() => ({ zone: undefined as unknown, operationsRead: vi.fn(), options: vi.fn(), cycles: vi.fn(), workspaceList: vi.fn(), workspaceDetail: vi.fn() }));
vi.mock("next/link", () => ({ default: ({ href, children, ...rest }: { href: string; children: ReactNode }) => <a href={href} {...rest}>{children}</a> }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }), useSearchParams: () => new URLSearchParams() }));
vi.mock("./use-zone-detail", () => ({ useZoneDetail: () => ({ data: state.zone, loading: false, error: undefined, reload: vi.fn(), replace: vi.fn() }) }));
vi.mock("@/features/operations/repository", () => ({ createOperationsRepository: () => ({ read: state.operationsRead }) }));
vi.mock("@/features/operations/lookups", () => ({ loadOptions: state.options }));
vi.mock("@/features/cycles-api/repository", () => ({ readCycles: state.cycles }));
vi.mock("@/features/api-workspace/workspace-repository", () => ({ createWorkspaceRepository: () => ({ list: state.workspaceList, detail: state.workspaceDetail, mutate: vi.fn(), create: vi.fn(), update: vi.fn() }) }));
vi.mock("@/features/operations/water-new-measurement-dialog", () => ({ NewMeasurement: () => <div role="dialog" aria-label="Ghi phép đo" /> }));
vi.mock("./zone-info-tab", () => ({ ZoneInfoTab: () => <p>Thông tin vùng</p> }));
vi.mock("./zone-map-tab", () => ({ ZoneMapTab: () => <p>Bản đồ vùng</p> }));
import { ZoneDetailPanel, type ZoneAccess } from "./zone-detail-panel";

const ID = "00000000-0000-4000-8000-000000000001";
const zone = (statusId: number) => ({ id: ID, code: "V01", name: "Vùng 1", location: null, area: null, statusId, status: statusId === 101 ? "In Use" : "Discontinued", inUseRaftCount: 0, licenseState: null, latitude: null, longitude: null, rowVersion: "AQ==" });
const raft = { edit: true, photoEdit: true, cycles: true, costs: true };
const access = (over: Partial<ZoneAccess> = {}): ZoneAccess => ({ edit: true, rafts: true, licenses: true, staff: true, water: true, waterCreate: true, raft, ...over });
const guard = { dirty: { current: false }, pending: { current: false }, leave: async (next: () => void) => next(), dialog: null };
const thresholds = { zoneId: ID, zoneCode: "V01", zoneName: "Vùng 1", zoneStatus: "In Use", thresholds: { phMin: 7, phMax: 8, salinityMin: 10, salinityMax: 30, temperatureMin: 20, temperatureMax: 30 } };
const open = (over: Partial<ZoneAccess> = {}) => render(<ZoneDetailPanel id={ID} access={access(over)} guard={guard as never} zones={[]} onChanged={vi.fn()} />);

beforeEach(() => {
  state.zone = zone(101);
  state.operationsRead.mockImplementation(async (action: string) => action === "thresholds" ? { status: "success", data: thresholds } : { status: "success", data: { items: [], page: 1, pageSize: 10, total: 0 } });
  state.options.mockResolvedValue({ status: "success", data: [] });
  state.cycles.mockResolvedValue({ status: "success", data: [] });
  state.workspaceList.mockResolvedValue({ status: "success", data: { items: [], page: 1, pageSize: 100, total: 0 } });
});
afterEach(() => { cleanup(); vi.clearAllMocks(); });

it("opens a zone with no summary reads and no cycles subtab", async () => {
  open();
  await screen.findByText("Thông tin vùng");
  expect(screen.queryByRole("group", { name: /Số liệu nhanh/ })).toBeNull();
  expect(screen.queryByRole("tab", { name: "Chu kỳ nuôi" })).toBeNull();
  expect(screen.getAllByRole("tab").map(tab => tab.textContent)).toEqual(["Thông tin", "Bản đồ", "Bè nuôi", "Giấy phép", "Nhân viên", "Quan trắc nước"]);
  // Only the active subtab reads: the info tab is a stub here, so nothing else may have been asked for.
  expect(state.operationsRead).not.toHaveBeenCalled();
  expect(state.options).not.toHaveBeenCalled();
  expect(state.cycles).not.toHaveBeenCalled();
  expect(state.workspaceList).not.toHaveBeenCalled();
});

it("shows Đo nhanh on the water subtab only for an In Use zone with water Create permission", async () => {
  const view = open();
  fireEvent.click(await screen.findByRole("tab", { name: "Quan trắc nước" }));
  expect(await screen.findByRole("button", { name: /Đo nhanh/ })).toBeTruthy();
  view.unmount();

  state.zone = zone(102);
  const discontinued = open();
  fireEvent.click(await screen.findByRole("tab", { name: "Quan trắc nước" }));
  await waitFor(() => expect(screen.getByText(/Ngưỡng đang áp dụng/)).toBeTruthy());
  expect(screen.queryByRole("button", { name: /Đo nhanh/ })).toBeNull();
  discontinued.unmount();

  state.zone = zone(101);
  open({ waterCreate: false });
  fireEvent.click(await screen.findByRole("tab", { name: "Quan trắc nước" }));
  await waitFor(() => expect(screen.getByText(/Ngưỡng đang áp dụng/)).toBeTruthy());
  expect(screen.queryByRole("button", { name: /Đo nhanh/ })).toBeNull();
});
