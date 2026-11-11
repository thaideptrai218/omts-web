// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from "@testing-library/react";
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
vi.mock("@/features/purchase-documents/repository", () => ({ usePurchaseLookups: () => ({ suppliers: [], items: [], rafts: [], receivers: [], loading: false, refresh: vi.fn() }) }));
import { IssuesScreen } from "./issues-screen";
import { ToastProvider } from "@/components/ui/toast-provider";

const row = { id: "122bb318-a72e-49aa-a8d7-a6169f889007", kind: "Use", code: "XD000001", statusId: 3802, status: "Completed", issuedAt: "2026-11-11T08:00:00+07:00", zoneId: "5b0e2f6e-6c5b-4c75-a0a3-0c7a1e3e1a11", zoneCode: "DEMO-01",
  raftId: null, raftCode: null, issueTypeId: null, issueTypeName: "Thả giống", receiverEmployeeId: null, receiverName: "Anh Ba", reason: null, notes: null, totalValue: 90000,
  createdAt: "2026-11-11T08:00:00+07:00", createdBy: "Chủ", completedAt: null, cancelledAt: null, cancelReason: null, rowVersion: "v" };
const page = (patch: object = {}) => ({ status: "success", data: { items: [row], page: 1, pageSize: 15, total: 1, summary: { totalValue: 90000 }, ...patch } });
const grant = (...pairs: [string, string][]) => { state.context.permissions.functionPermissions = pairs.map(([functionCode, action]) => ({ functionCode, action })); };

beforeEach(() => {
  try { window.localStorage.clear(); } catch { /* storage may be unavailable */ }
  state.linked = "";
  state.context.identity.subjectType = "Staff";
  state.list.mockResolvedValue(page());
});
afterEach(() => { cleanup(); vi.clearAllMocks(); });

it("lists use issues of the zone-scoped function with the total of the completed ones and a create button only for who may create", async () => {
  grant(["INPUT_ISSUES", "View"]);
  const { unmount } = render(<ToastProvider><IssuesScreen kind="Use" /></ToastProvider>);
  await screen.findByText("Thả giống");
  expect(screen.getByRole("row", { name: "Tổng hợp theo bộ lọc" })).toBeTruthy();
  expect(state.list.mock.calls[0][0]).toMatchObject({ kind: "Use" });
  expect(screen.queryByRole("button", { name: /Tạo mới/ })).toBeNull();
  unmount();
  grant(["INPUT_ISSUES", "View"], ["INPUT_ISSUES", "Create"]);
  render(<ToastProvider><IssuesScreen kind="Use" /></ToastProvider>);
  expect(await screen.findByRole("button", { name: /Tạo mới/ })).toBeTruthy();
});

it("keeps disposals from an account that may only read the use issues, and gives the Owner the create button", async () => {
  grant(["INPUT_ISSUES", "View"]);
  const { unmount } = render(<ToastProvider><IssuesScreen kind="Disposal" /></ToastProvider>);
  expect((await screen.findByRole("alert")).textContent).toContain("không có quyền");
  expect(state.list).not.toHaveBeenCalled();
  unmount();
  state.context.identity.subjectType = "CooperativeOwner";
  state.list.mockResolvedValue(page({ items: [{ ...row, kind: "Disposal", code: "XH000001", reason: "Hỏng" }] }));
  render(<ToastProvider><IssuesScreen kind="Disposal" /></ToastProvider>);
  await screen.findByText("Hỏng");
  expect(screen.getByRole("button", { name: /Tạo mới/ })).toBeTruthy();
  expect(screen.queryByText("Người nhận")).toBeNull();
});

it("searches a linked document by its code among every status and time and opens its row", async () => {
  grant(["INPUT_ISSUES", "View"]);
  state.linked = "XD000001";
  render(<ToastProvider><IssuesScreen kind="Use" /></ToastProvider>);
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
  render(<ToastProvider><IssuesScreen kind="Use" /></ToastProvider>);
  await screen.findByRole("alert");
  expect(screen.queryByText(/Chưa có phiếu xuất dùng/)).toBeNull();
});
