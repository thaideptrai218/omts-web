// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render as baseRender, screen } from "@testing-library/react";
import { ToastProvider } from "@/components/ui/toast-provider";
const state = vi.hoisted(() => ({ list: vi.fn() }));
vi.mock("next/navigation", () => ({ useSearchParams: () => new URLSearchParams() }));
vi.mock("./api-workspace-shell", () => ({ useApiWorkspace: () => ({ identity: { subjectType: "Staff" }, permissions: { functionPermissions: [] } }) }));
vi.mock("./workspace-repository", () => ({ createWorkspaceRepository: (resource: string) => ({ list: (query: unknown) => state.list(resource, query) }) }));
import { ApiResourceScreen } from "./api-resource-screen";
const render = (ui: import("react").ReactElement) => baseRender(<ToastProvider>{ui}</ToastProvider>);
const zoneId = (number: number) => `00000000-0000-4000-8000-${String(number).padStart(12, "0")}`;
const zone = (number: number, name: string) => ({ id: zoneId(number), code: `Z${number}`, name, location: null, area: null, statusId: 101, status: "In Use", inUseRaftCount: 0, licenseState: null });
afterEach(() => { cleanup(); vi.clearAllMocks(); });
it("loads the second zone page and allows a raft read in that zone", async () => {
  state.list.mockImplementation(async (resource, query) => ({ status: "success", data: resource === "zones" ? { items: [query.page === "1" ? zone(1, "Vùng đầu") : zone(101, "Vùng trang2")], page: Number(query.page), pageSize: 100, total: 101 } : { items: [], page: 1, pageSize: 20, total: 0 } }));
  render(<ApiResourceScreen resource="rafts" />); await screen.findByRole("option", { name: "Z101 · Vùng trang2" }); fireEvent.change(screen.getByRole("combobox", { name: "Vùng nuôi" }), { target: { value: zoneId(101) } });
  await vi.waitFor(() => expect(state.list).toHaveBeenCalledWith("rafts", expect.objectContaining({ zoneId: zoneId(101) })));
});
it("reports failed zone lookup and recovers on an explicit retry", async () => {
  state.list.mockResolvedValue({ status: "error", httpStatus: 503, uncertain: false }); render(<ApiResourceScreen resource="rafts" />);
  const retry = await screen.findByRole("button", { name: "Tải lại danh mục vùng" });
  state.list.mockResolvedValue({ status: "success", data: { items: [zone(1, "Vùng khôi phục")], page: 1, pageSize: 100, total: 1 } }); fireEvent.click(retry);
  await screen.findByRole("option", { name: "Z1 · Vùng khôi phục" }); expect(screen.queryByRole("button", { name: "Tải lại danh mục vùng" })).toBeNull();
});
