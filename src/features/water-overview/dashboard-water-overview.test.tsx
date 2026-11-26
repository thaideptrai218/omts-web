// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import type { ZoneOverviewItem } from "./contracts";

const state = vi.hoisted(() => ({ subjectType: "CooperativeOwner", read: vi.fn() }));
vi.mock("@/features/operations/repository", () => ({ createOperationsRepository: () => ({ read: state.read }) }));
vi.mock("@/features/api-workspace/api-workspace-shell", () => ({ useApiWorkspace: () => ({ identity: { subjectType: state.subjectType }, permissions: { functionPermissions: [] } }) }));
import { DashboardWaterOverview } from "./dashboard-water-overview";

const recent = new Date(Date.now() - 5 * 60_000).toISOString();
const zone = (patch: Partial<ZoneOverviewItem>): ZoneOverviewItem => ({ zoneId: "00000000-0000-4000-8000-000000000001", zoneCode: "Z01", zoneName: "Vùng một", zoneStatus: "In Use", zoneStatusCode: "ZONE_IN_USE",
  latestMeasuredAt: recent, hasWaterAlert: false, valuesOutside: [], ...patch });
const items = [
  zone({ zoneId: "00000000-0000-4000-8000-000000000001", zoneCode: "Z01", zoneName: "Vùng một" }),
  zone({ zoneId: "00000000-0000-4000-8000-000000000002", zoneCode: "Z02", zoneName: "Vùng cũ", zoneStatus: "Discontinued", zoneStatusCode: "ZONE_DISCONTINUED", hasWaterAlert: true }),
  zone({ zoneId: "00000000-0000-4000-8000-000000000003", zoneCode: "Z03", zoneName: "Vùng ba", hasWaterAlert: true, valuesOutside: [{ indicator: "pH", value: 9, unit: null, direction: "High", min: 7.5, max: 8.5 }] }),
  zone({ zoneId: "00000000-0000-4000-8000-000000000004", zoneCode: "Z04", zoneName: "Vùng bốn", latestMeasuredAt: null }),
];

beforeEach(() => { state.subjectType = "CooperativeOwner"; state.read.mockResolvedValue({ status: "success", data: items }); });
afterEach(() => { cleanup(); vi.clearAllMocks(); });

it("lists only In Use zones, the zone with an alert first, with its violated values in Vietnamese and a link to that zone's water screen", async () => {
  render(<DashboardWaterOverview />);
  const list = within(await screen.findByRole("list"));
  const rows = list.getAllByRole("link");
  expect(rows.map(row => row.getAttribute("aria-label"))).toEqual(["Xem chất lượng nước vùng Z03 Vùng ba", "Xem chất lượng nước vùng Z01 Vùng một", "Xem chất lượng nước vùng Z04 Vùng bốn"]);
  expect(rows[0].getAttribute("href")).toContain("zoneId=00000000-0000-4000-8000-000000000003");
  expect(rows[0].textContent).toContain("Vượt ngưỡng: pH 9 cao hơn mức cho phép 8,5");
  expect(rows[1].textContent).toContain("5 phút trước");
  expect(rows[2].textContent).toContain("Chưa có lần đo");
  expect(screen.getByText("1 vùng đang cảnh báo · 1 vùng chưa đo gần đây")).toBeTruthy();
  expect(state.read).toHaveBeenCalledWith("zones-overview", { inUseOnly: "true" }, expect.anything(), expect.anything());
});

it("shows nothing and reads nothing for an account without the water permission", () => {
  state.subjectType = "Trader";
  const { container } = render(<DashboardWaterOverview />);
  expect(container.firstChild).toBeNull();
  expect(state.read).not.toHaveBeenCalled();
});

it("offers a retry when the overview cannot be read", async () => {
  state.read.mockResolvedValueOnce({ status: "error", httpStatus: 503, uncertain: false });
  render(<DashboardWaterOverview />);
  expect(await screen.findByRole("button", { name: "Tải lại" })).toBeTruthy();
  state.read.mockResolvedValue({ status: "success", data: items });
  screen.getByRole("button", { name: "Tải lại" }).click();
  await waitFor(() => expect(screen.getAllByRole("link").length).toBe(3));
});
