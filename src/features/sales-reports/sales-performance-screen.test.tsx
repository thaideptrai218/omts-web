// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeAll, beforeEach, expect, it, vi } from "vitest";
import { HeaderZones, chooseHeaderZones, headerZoneIds } from "@/test/header-zones";
import { SalesPerformanceScreen } from "./sales-performance-screen";

const workspace = vi.hoisted(() => ({ identity: { subjectType: "CooperativeOwner" }, permissions: { functionPermissions: [] } }));
vi.mock("@/features/api-workspace/api-workspace-shell", () => ({ useApiWorkspace: () => workspace }));
vi.mock("@/components/ui/toast-provider", () => ({ useToast: () => ({ notify: vi.fn() }) }));
const nav = vi.hoisted(() => ({ search: "" }));
vi.mock("@/features/zones-api/in-use-zones", async () => (await import("@/test/header-zone-rows")).inUseZonesMock);
vi.mock("next/navigation", () => ({ useSearchParams: () => new URLSearchParams(nav.search), useRouter: () => ({ push: vi.fn(), replace: vi.fn() }) }));

const ids = { zone: "11111111-1111-4111-8111-111111111111", customer: "22222222-2222-4222-8222-222222222222" };
const figures = { invoiceCount: 2, invoicedKg: 50, revenue: 1_000_000, priceCuts: 50_000, salesReturns: 0, netRevenue: 950_000, soldKg: 50, netMoneyReceived: null, receivable: null, owedBack: null, netDebt: null };
const report = { computedAt: "2026-11-19T01:00:00+07:00", from: "2026-11-01", to: "2026-11-19", groupBy: "day", filters: { zones: [], customers: [], products: [] },
  groups: [{ key: "2026-11-18", label: "18/11/2026", ...figures }], totals: figures, message: null, messageCode: null };
const empty = { ...report, groups: [], totals: { ...figures, invoiceCount: 0, revenue: 0, netRevenue: 0, priceCuts: 0, soldKg: 0 }, message: "Không có dữ liệu phù hợp." };

const fetchSpy = vi.fn();
const respond = (data: unknown) => Promise.resolve(new Response(JSON.stringify({ status: "success", data }), { status: 200, headers: { "Content-Type": "application/json" } }));
beforeAll(() => { vi.stubGlobal("ResizeObserver", class { observe() {} unobserve() {} disconnect() {} }); });
beforeEach(() => {
  nav.search = ""; chooseHeaderZones([]);
  vi.stubGlobal("fetch", fetchSpy);
  fetchSpy.mockImplementation((url: string) => {
    if (url.includes("/api/operations/sales-report")) return respond(report);
    if (url.includes("/api/zones")) return respond({ items: [{ id: ids.zone, name: "Vùng A", code: "A" }], page: 1, pageSize: 100, total: 1 });
    return respond({ items: [], page: 1, pageSize: 100, total: 0 });
  });
});
afterEach(() => { cleanup(); fetchSpy.mockReset(); vi.unstubAllGlobals(); });

it("loads the sales report from the BFF and shows totals and the alternative table", async () => {
  render(<SalesPerformanceScreen />);
  expect(screen.getByRole("heading", { level: 1, name: "Bán hàng" })).toBeTruthy();
  expect((await screen.findAllByText("Doanh thu thuần")).length).toBeGreaterThan(0);
  const call = fetchSpy.mock.calls.map(([url]) => String(url)).find((url) => url.includes("/api/operations/sales-report") && url.includes("action=report"));
  expect(call).toContain("groupBy=day");
  expect(screen.getAllByText("18/11/2026").length).toBeGreaterThan(0);
});

it("shows the backend empty message instead of the tables", async () => {
  fetchSpy.mockImplementation((url: string) => String(url).includes("/api/operations/sales-report") ? respond(empty) : respond({ items: [], page: 1, pageSize: 100, total: 0 }));
  render(<SalesPerformanceScreen />);
  await waitFor(() => expect(screen.getByText("Không có dữ liệu phù hợp.")).toBeTruthy());
  expect(screen.queryByText("Doanh thu thuần")).toBeNull();
});

it("tells a user without the right that the report is not available, without calling the API", () => {
  workspace.identity = { subjectType: "Trader" };
  render(<SalesPerformanceScreen />);
  expect(screen.getByRole("alert").textContent).toContain("chưa có quyền");
  expect(fetchSpy.mock.calls.some(([url]) => String(url).includes("action=report"))).toBe(false);
  workspace.identity = { subjectType: "CooperativeOwner" };
});

const reportCalls = () => fetchSpy.mock.calls.map(([url]) => new URL(String(url), "http://x")).filter((url) => url.pathname.endsWith("/sales-report") && url.searchParams.get("action") === "report");
const lastZones = () => reportCalls().at(-1)?.searchParams.get("zoneIds");

it("starts on the zones chosen in the header and writes pill changes back to it", async () => {
  chooseHeaderZones([headerZoneIds[0], headerZoneIds[1]]);
  render(<HeaderZones><SalesPerformanceScreen /></HeaderZones>);
  await waitFor(() => expect(lastZones()).toBe(`${headerZoneIds[0]},${headerZoneIds[1]}`));
  fireEvent.click(await screen.findByRole("button", { name: "Bỏ lọc vùng Minh Châu" }));
  await waitFor(() => expect(lastZones()).toBe(headerZoneIds[0]));
  expect(JSON.parse(localStorage.getItem("omts.selected-zones.v1.header-zones-test")!)).toEqual({ kind: "ids", ids: [headerZoneIds[0]] });
  fireEvent.click(screen.getByRole("button", { name: "Bỏ lọc vùng Ngọc Vừng" }));
  await waitFor(() => expect(lastZones()).toBeNull());
  expect(JSON.parse(localStorage.getItem("omts.selected-zones.v1.header-zones-test")!)).toEqual({ kind: "all" });
});

it("lets a link with ?zones narrow the header once", async () => {
  nav.search = `zones=${headerZoneIds[2]}`;
  render(<HeaderZones><SalesPerformanceScreen /></HeaderZones>);
  await waitFor(() => expect(lastZones()).toBe(headerZoneIds[2]));
  expect(JSON.parse(localStorage.getItem("omts.selected-zones.v1.header-zones-test")!)).toEqual({ kind: "ids", ids: [headerZoneIds[2]] });
  fireEvent.click(await screen.findByRole("button", { name: "Bỏ lọc vùng Quan Lạn" }));
  await waitFor(() => expect(lastZones()).toBeNull());
});
