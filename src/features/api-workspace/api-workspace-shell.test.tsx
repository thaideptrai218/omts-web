// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, within } from "@testing-library/react";
import type { ComponentProps } from "react";
import { ApiWorkspaceShell } from "./api-workspace-shell";

vi.mock("next/navigation", () => ({ usePathname: () => "/dashboard" }));
vi.mock("@/features/auth/api/api-auth-client", () => ({ logoutWithApi: vi.fn() }));
vi.mock("@/features/inbox-api/inbox-bell", () => ({ InboxBell: () => null }));
vi.mock("@/features/trader-requests-api/requests-dialog", () => ({ TraderRequestsDialog: () => null }));
afterEach(cleanup);
function setup(subjectType: "CooperativeOwner" | "Trader") {
  const context: ComponentProps<typeof ApiWorkspaceShell>["context"] = {
    identity: { accountId: "529ec3ce-af8f-42f7-a08f-4bab36ba7e62", username: "fixture", subjectType },
    permissions: { access: { permissions: [] }, functionPermissions: [] },
  };
  return render(<ApiWorkspaceShell context={context}><h1>Nội dung</h1></ApiWorkspaceShell>);
}
describe("shared API navigation shell", () => {
  it("places the only cycle link under cultivation and uses the seasonal employee label", () => {
    const view = setup("CooperativeOwner");
    const nav = within(view.container).getByRole("navigation", { name: "Chức năng" });
    const cultivation = within(nav).getByText("Nuôi trồng", { exact: true }).closest("details")!;
    fireEvent.click(cultivation.querySelector("summary")!);
    expect(within(cultivation).getByRole("link", { name: "Chu kỳ nuôi" }).getAttribute("href")).toBe("/farming/cycles");
    expect(nav.querySelectorAll('a[href="/farming/cycles"]')).toHaveLength(1);
    const personnel = within(nav).getByText("Nhân sự", { exact: true }).closest("details")!;
    fireEvent.click(personnel.querySelector("summary")!);
    expect(within(personnel).getByRole("link", { name: "Nhân viên thời vụ" }).getAttribute("href")).toBe("/workspace/employees");
    expect(within(personnel).getByRole("link", { name: "Phân công và chấm công" }).getAttribute("href")).toBe("/operations/workforce");
  });
  it("does not expose owner administration to a trader", () => {
    const view = setup("Trader");
    const nav = within(view.container).getByRole("navigation", { name: "Chức năng" });
    expect(nav.querySelector('a[href="/workspace/accounts"]')).toBeNull();
    expect(nav.querySelector('a[href="/operations/workforce"]')).toBeNull();
    expect(nav.querySelector('a[href="/farming/cycles"]')).toBeNull();
    const sales = within(nav).getByText("Kinh doanh", { exact: true }).closest("details")!;
    fireEvent.click(sales.querySelector("summary")!);
    expect(within(sales).getByRole("link", { name: "Yêu cầu mua hàu" })).toBeTruthy();
  });
  it("puts the overview first and moves settings destinations into the header settings menu", () => {
    const view = setup("CooperativeOwner");
    const nav = within(view.container).getByRole("navigation", { name: "Chức năng" });
    expect(nav.querySelector("details summary")?.textContent).toBe("Điều hành");
    expect(nav.querySelector('details a[href="/dashboard"]')).toBeTruthy();
    expect(nav.querySelector('a[href="/cooperative/profile"]')).toBeNull();
    expect(nav.querySelector('a[href="/cooperative/receiving-bank-account"]')).toBeNull();
    const settings = within(view.container).getByRole("button", { name: "Cài đặt" });
    expect(settings.getAttribute("aria-expanded")).toBe("false");
    fireEvent.click(settings);
    expect(settings.getAttribute("aria-expanded")).toBe("true");
    expect(within(view.container).getByRole("link", { name: "Hồ sơ hợp tác xã" }).getAttribute("href")).toBe("/cooperative/profile");
    expect(within(view.container).getByRole("link", { name: "Ngân hàng nhận tiền" }).getAttribute("href")).toBe("/cooperative/receiving-bank-account");
    fireEvent.keyDown(settings, { key: "Escape" });
    expect(settings.getAttribute("aria-expanded")).toBe("false");
  });
  it("collapses the account block to an avatar button that names the account and keeps sign-out reachable", () => {
    const view = setup("Trader");
    expect(within(view.container).queryByRole("button", { name: "Cài đặt" })).toBeNull();
    const avatar = within(view.container).getByRole("button", { name: /Menu tài khoản: fixture, Thương lái/ });
    expect(within(view.container).queryByText("Đăng xuất")).toBeNull();
    fireEvent.click(avatar);
    expect(within(view.container).getByRole("link", { name: /^Hồ sơ cá nhân: fixture, Thương lái/ }).getAttribute("href")).toBe("/account");
    expect(within(view.container).getByRole("button", { name: "Đăng xuất" })).toBeTruthy();
    expect(within(view.container).getByRole("button", { name: "Chủ đề" })).toBeTruthy();
    fireEvent.pointerDown(document.body);
    expect(avatar.getAttribute("aria-expanded")).toBe("false");
  });
  it("closes a top navigation group after selecting a destination", () => {
    const view = setup("Trader");
    const nav = within(view.container).getByRole("navigation", { name: "Chức năng" });
    const sales = within(nav).getByText("Kinh doanh", { exact: true }).closest("details")!;
    fireEvent.click(sales.querySelector("summary")!);
    expect(sales.open).toBe(true);
    sales.addEventListener("click", event => event.preventDefault());
    fireEvent.click(within(sales).getByRole("link", { name: "Danh mục sản phẩm hàu" }));
    expect(sales.open).toBe(false);
  });
});
