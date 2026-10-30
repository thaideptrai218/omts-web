// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import type { ReactNode } from "react";
const state = vi.hoisted(() => ({ list: vi.fn(), mutate: vi.fn() }));
vi.mock("next/navigation", () => ({ useSearchParams: () => new URLSearchParams() }));
vi.mock("./api-workspace-shell", () => ({ useApiWorkspace: () => ({ identity: { subjectType: "CooperativeOwner" }, permissions: { functionPermissions: [] } }) }));
vi.mock("./workspace-repository", () => ({ createWorkspaceRepository: () => state }));
vi.mock("@/components/ui/dialog", () => ({ Dialog: ({ title, children }: { title: string; children: ReactNode }) => <div role="dialog" aria-label={title}>{children}</div> }));
import { ApiResourceScreen } from "./api-resource-screen";
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.clearAllMocks(); });
it("keeps the supplier draft when discard is declined and closes only after explicit consent", async () => {
  state.list.mockResolvedValue({ status: "success", data: { items: [], page: 1, pageSize: 20, total: 0 } }); const native = vi.spyOn(window, "confirm"); render(<ApiResourceScreen resource="suppliers" />);
  fireEvent.click(screen.getByRole("button", { name: "Thêm mới" })); fireEvent.change(screen.getByRole("textbox", { name: "Tên nhà cung cấp" }), { target: { value: "QA draft" } }); fireEvent.click(screen.getByRole("button", { name: "Đóng", exact: true }));
  fireEvent.click(within(await screen.findByRole("dialog", { name: "Xác nhận thao tác" })).getByRole("button", { name: "Quay lại" }));
  expect((screen.getByRole("textbox", { name: "Tên nhà cung cấp" }) as HTMLInputElement).value).toBe("QA draft"); expect(state.mutate).not.toHaveBeenCalled(); expect(native).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Đóng", exact: true })); fireEvent.click(within(await screen.findByRole("dialog", { name: "Xác nhận thao tác" })).getByRole("button", { name: "Đồng ý" }));
  await vi.waitFor(() => expect(screen.queryByRole("dialog", { name: "Thêm mới · Nhà cung cấp" })).toBeNull()); expect(state.mutate).not.toHaveBeenCalled();
});
