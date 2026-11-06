// @vitest-environment jsdom
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, within } from "@testing-library/react";
import type { ComponentProps } from "react";
import { ApiWorkspaceShell } from "./api-workspace-shell";

vi.mock("next/navigation", () => ({ usePathname: () => "/dashboard" }));
vi.mock("@/features/auth/api/api-auth-client", () => ({ logoutWithApi: vi.fn() }));
vi.mock("@/features/inbox-api/inbox-bell", () => ({ InboxBell: () => null }));
vi.mock("@/features/trader-requests-api/requests-dialog", () => ({ TraderRequestsDialog: () => null }));
beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function () { this.setAttribute("open", ""); };
  HTMLDialogElement.prototype.close = function () { this.removeAttribute("open"); };
});
afterEach(cleanup);
function setup(subjectType: "CooperativeOwner" | "Trader") {
  const context: ComponentProps<typeof ApiWorkspaceShell>["context"] = {
    identity: { accountId: "529ec3ce-af8f-42f7-a08f-4bab36ba7e62", username: "fixture", subjectType },
    permissions: { access: { permissions: [] }, functionPermissions: [] },
  };
  return render(<ApiWorkspaceShell context={context}><h1>Nội dung</h1></ApiWorkspaceShell>);
}
describe("shared API navigation shell", () => {
  it("keeps owner modules and compact link names available", () => {
    const view = setup("CooperativeOwner");
    const sidebar = view.container.querySelector("aside")!;
    expect(within(sidebar).getByRole("link", { name: "Phân công và chấm công" }).getAttribute("href")).toBe("/operations/workforce");
    fireEvent.click(within(sidebar).getByRole("button", { name: "Thu gọn menu" }));
    expect(within(sidebar).getByRole("link", { name: "Phân công và chấm công" }).getAttribute("title")).toBe("Phân công và chấm công");
    expect(within(sidebar).getByRole("link", { name: "Tài khoản nhân viên nội bộ" })).toBeTruthy();
  });
  it("does not expose owner administration to a trader", () => {
    const view = setup("Trader");
    const sidebar = within(view.container.querySelector("aside")!);
    expect(sidebar.queryByRole("link", { name: "Tài khoản nhân viên nội bộ" })).toBeNull();
    expect(sidebar.queryByRole("link", { name: "Phân công và chấm công" })).toBeNull();
    expect(sidebar.queryByRole("button", { name: "Yêu cầu thương lái" })).toBeNull();
    expect(sidebar.getByRole("link", { name: "Yêu cầu mua hàu" })).toBeTruthy();
  });
  it("closes the mobile drawer after selecting an API destination", () => {
    const view = setup("Trader");
    fireEvent.click(within(view.container).getByRole("button", { name: "Mở điều hướng" }));
    const dialog = view.container.querySelector("dialog")!;
    expect(dialog.open).toBe(true);
    dialog.addEventListener("click", (event) => event.preventDefault());
    fireEvent.click(within(dialog).getByRole("link", { name: "Danh mục sản phẩm hàu" }));
    expect(dialog.open).toBe(false);
  });
});
