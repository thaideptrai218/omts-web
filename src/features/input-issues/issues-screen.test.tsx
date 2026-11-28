// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  context: { identity: { subjectType: "Staff", username: "nv" }, permissions: { functionPermissions: [] as { functionCode: string; action: string }[] } },
  list: vi.fn(), linked: "", push: vi.fn(),
}));
vi.mock("@/features/api-workspace/api-workspace-shell", () => ({ useApiWorkspace: () => state.context }));
vi.mock("next/navigation", () => ({ useSearchParams: () => new URLSearchParams(state.linked ? { code: state.linked } : {}), useRouter: () => ({ push: state.push }) }));
vi.mock("@/features/input-items/repository", async (original) => ({
  ...(await original<typeof import("@/features/input-items/repository")>()),
  issueRepository: { list: state.list, detail: vi.fn(async () => ({ status: "error", httpStatus: 404, uncertain: false })), receivers: vi.fn(async () => ({ status: "success", data: [] })), exportList: vi.fn() },
  inputRepository: { issueTypes: vi.fn(async () => ({ status: "success", data: [] })) },
}));
vi.mock("@/features/cash-book/repository", () => ({ listCollectors: vi.fn(async () => ({ status: "success", data: [] })), listBanks: vi.fn(async () => ({ status: "success", data: [] })) }));
vi.mock("@/features/operations/lookups", () => ({ loadOptions: vi.fn(async () => ({ status: "success", data: [] })) }));
vi.mock("@/features/purchase-documents/repository", () => ({ usePurchaseLookups: () => ({ suppliers: [], items: [], rafts: [{ id: "0f1c0a8e-3d3a-4f6b-9e57-2a3c7f1d0b30", code: "B1-01", zoneId: "00000000-0000-4000-8000-000000000002" }], receivers: [], loading: false, refresh: vi.fn() }) }));
vi.mock("@/features/zones-api/in-use-zones", async () => (await import("@/test/header-zone-rows")).inUseZonesMock);
import { IssuesScreen } from "./issues-screen";
import { ToastProvider } from "@/components/ui/toast-provider";
import { HeaderZones, chooseHeaderZones, headerZoneIds } from "@/test/header-zones";

const row = { id: "122bb318-a72e-49aa-a8d7-a6169f889007", kind: "Use", code: "XD000001", statusId: 3802, status: "Completed", issuedAt: "2026-11-11T08:00:00+07:00", zoneId: "5b0e2f6e-6c5b-4c75-a0a3-0c7a1e3e1a11", zoneCode: "DEMO-01",
  raftId: null, raftCode: null, issueTypeId: null, issueTypeName: "Thả giống", receiverEmployeeId: null, receiverName: "Anh Ba", reason: null, notes: null, totalValue: 90000,
  createdAt: "2026-11-11T08:00:00+07:00", createdBy: "Chủ", completedAt: null, cancelledAt: null, cancelReason: null, rowVersion: "v" };
const page = (patch: object = {}) => ({ status: "success", data: { items: [row], page: 1, pageSize: 15, total: 1, summary: { totalValue: 90000 }, ...patch } });
const grant = (...pairs: [string, string][]) => { state.context.permissions.functionPermissions = pairs.map(([functionCode, action]) => ({ functionCode, action })); };

beforeEach(() => {
  chooseHeaderZones([]);
  state.linked = "";
  state.context.identity.subjectType = "Staff";
  state.list.mockResolvedValue(page());
});
afterEach(() => { cleanup(); vi.clearAllMocks(); });

it("lists use issues of the zone-scoped function with the total of the completed ones and a create button only for who may create", async () => {
  grant(["INPUT_ISSUES", "View"]);
  const { unmount } = render(<ToastProvider><HeaderZones><IssuesScreen kind="Use" /></HeaderZones></ToastProvider>);
  await screen.findByText("Thả giống");
  expect(screen.getByRole("row", { name: "Tổng hợp theo bộ lọc" })).toBeTruthy();
  expect(state.list.mock.calls[0][0]).toMatchObject({ kind: "Use" });
  expect(screen.queryByRole("button", { name: /Tạo mới/ })).toBeNull();
  unmount();
  grant(["INPUT_ISSUES", "View"], ["INPUT_ISSUES", "Create"]);
  render(<ToastProvider><HeaderZones><IssuesScreen kind="Use" /></HeaderZones></ToastProvider>);
  expect(await screen.findByRole("button", { name: /Tạo mới/ })).toBeTruthy();
});

it("keeps disposals from an account that may only read the use issues, and gives the Owner the create button", async () => {
  grant(["INPUT_ISSUES", "View"]);
  const { unmount } = render(<ToastProvider><HeaderZones><IssuesScreen kind="Disposal" /></HeaderZones></ToastProvider>);
  expect((await screen.findByRole("alert")).textContent).toContain("không có quyền");
  expect(state.list).not.toHaveBeenCalled();
  unmount();
  state.context.identity.subjectType = "CooperativeOwner";
  state.list.mockResolvedValue(page({ items: [{ ...row, kind: "Disposal", code: "XH000001", reason: "Hỏng" }] }));
  render(<ToastProvider><HeaderZones><IssuesScreen kind="Disposal" /></HeaderZones></ToastProvider>);
  await screen.findByText("Hỏng");
  expect(screen.getByRole("button", { name: /Tạo mới/ })).toBeTruthy();
  expect(screen.queryByText("Người nhận")).toBeNull();
});

it("searches a linked document by its code among every status and time and opens its row", async () => {
  grant(["INPUT_ISSUES", "View"]);
  state.linked = "XD000001";
  render(<ToastProvider><HeaderZones><IssuesScreen kind="Use" /></HeaderZones></ToastProvider>);
  await waitFor(() => expect(state.list).toHaveBeenCalled());
  const query = state.list.mock.calls[0][0];
  expect(query).toMatchObject({ search: "XD000001", kind: "Use" });
  expect(query.status).toBeUndefined();
  expect(query.from).toBeUndefined();
  expect((screen.getByLabelText("Tìm phiếu xuất dùng") as HTMLInputElement).value).toBe("XD000001");
});

it("does not describe a failed read as an empty list", async () => {
  grant(["INPUT_ISSUES", "View"]);
  state.list.mockResolvedValue({ status: "error", httpStatus: 404, uncertain: false });
  render(<ToastProvider><HeaderZones><IssuesScreen kind="Use" /></HeaderZones></ToastProvider>);
  await screen.findByRole("alert");
  expect(screen.queryByText(/Chưa có phiếu xuất dùng/)).toBeNull();
});

// A use issue belongs to a zone, so its zone filter is the header zone chip; the Bè filter needs exactly one zone; a disposal has no zone at all.
it("follows the header zones both ways for use issues and keeps the Bè filter for a single zone", async () => {
  grant(["INPUT_ISSUES", "View"]);
  render(<ToastProvider><HeaderZones><IssuesScreen kind="Use" /></HeaderZones></ToastProvider>);
  await screen.findByText("Thả giống");
  const last = () => state.list.mock.calls.at(-1)![0], zone = () => screen.getByLabelText("Vùng") as HTMLSelectElement, raft = () => screen.getByLabelText("Bè") as HTMLSelectElement;
  expect(zone().selectedOptions[0].textContent).toBe("Tất cả vùng nuôi");
  expect(last().zoneIds).toBeUndefined();
  expect(raft().disabled).toBe(true);
  expect(raft().selectedOptions[0].textContent).toBe("Chọn một vùng để lọc theo bè");
  fireEvent.change(zone(), { target: { value: headerZoneIds[1] } });
  await waitFor(() => expect(last()).toMatchObject({ kind: "Use", zoneIds: headerZoneIds[1], page: "1" }));
  expect(JSON.parse(localStorage.getItem("omts.selected-zones.v1.header-zones-test")!)).toEqual({ kind: "ids", ids: [headerZoneIds[1]] });
  await waitFor(() => expect(raft().disabled).toBe(false));
  fireEvent.change(raft(), { target: { value: "0f1c0a8e-3d3a-4f6b-9e57-2a3c7f1d0b30" } });
  await waitFor(() => expect(last()).toMatchObject({ zoneIds: headerZoneIds[1], raftId: "0f1c0a8e-3d3a-4f6b-9e57-2a3c7f1d0b30" }));
  // Another zone: the raft belonged to the first one.
  fireEvent.change(zone(), { target: { value: headerZoneIds[2] } });
  await waitFor(() => expect(last()).toMatchObject({ zoneIds: headerZoneIds[2] }));
  expect(last().raftId).toBeUndefined();
});

it("sends a header subset of several zones for use issues, and never a zone for disposals", async () => {
  grant(["INPUT_ISSUES", "View"]);
  chooseHeaderZones([headerZoneIds[0], headerZoneIds[2]]);
  const { unmount } = render(<ToastProvider><HeaderZones><IssuesScreen kind="Use" /></HeaderZones></ToastProvider>);
  await waitFor(() => expect(state.list.mock.calls.at(-1)![0].zoneIds).toBe(`${headerZoneIds[0]},${headerZoneIds[2]}`));
  expect((screen.getByLabelText("Vùng") as HTMLSelectElement).selectedOptions[0].textContent).toBe("2 vùng đã chọn");
  unmount();
  state.list.mockClear();
  state.context.identity.subjectType = "CooperativeOwner";
  render(<ToastProvider><HeaderZones><IssuesScreen kind="Disposal" /></HeaderZones></ToastProvider>);
  await waitFor(() => expect(state.list).toHaveBeenCalled());
  expect(state.list.mock.calls.every(call => call[0].zoneIds === undefined && call[0].zoneId === undefined)).toBe(true);
  expect(screen.queryByLabelText("Vùng")).toBeNull();
});
