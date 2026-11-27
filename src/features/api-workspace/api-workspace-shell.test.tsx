// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, within } from "@testing-library/react";
import type { ComponentProps } from "react";
import { ApiWorkspaceShell } from "./api-workspace-shell";

vi.mock("next/navigation", () => ({ usePathname: () => "/dashboard", useSearchParams: () => new URLSearchParams() }));
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
  it("has no cycle menu entry (the cycles live in the raft screen), keeps the raft and seeding links under cultivation, and uses the seasonal employee label", () => {
    const view = setup("CooperativeOwner");
    const nav = within(view.container).getByRole("navigation", { name: "Chức năng" });
    const cultivation = within(nav).getByText("Nuôi trồng", { exact: true }).closest("details")!;
    fireEvent.click(cultivation.querySelector("summary")!);
    expect(within(cultivation).queryByRole("link", { name: "Hành trình" })).toBeNull();
    expect(nav.querySelector('a[href="/farming/cycles"]')).toBeNull();
    expect(within(cultivation).getByRole("link", { name: "Bè nuôi" }).getAttribute("href")).toBe("/workspace/rafts");
    expect(within(cultivation).getByRole("link", { name: "Bắt đầu chu kỳ nuôi" }).getAttribute("href")).toBe("/operations/seeding");
    const personnel = within(nav).getByText("Nhân sự", { exact: true }).closest("details")!;
    fireEvent.click(personnel.querySelector("summary")!);
    expect(within(personnel).getByRole("link", { name: "Nhân viên" }).getAttribute("href")).toBe("/workspace/employees");
    expect(within(personnel).getByRole("link", { name: "Phân công và chấm công" }).getAttribute("href")).toBe("/operations/workforce");
  });
  it("opens with the most used group of each staff role, by the permission codes held", () => {
    const grant = (functionCode: string, actions: string[], scope: { kind: "all-zones" } | { kind: "zones"; zoneIds: string[] }) =>
      actions.map((action) => ({ functionCode, action, scope, dataScope: "AssignedZone" as const }));
    const zones = { kind: "zones" as const, zoneIds: ["z1"] }, all = { kind: "all-zones" as const }, crud = ["View", "Create", "Edit"];
    const staff = (permissions: ReturnType<typeof grant>) => {
      const context = { identity: { accountId: "529ec3ce-af8f-42f7-a08f-4bab36ba7e62", username: "fixture", subjectType: "Staff" }, permissions: { access: { permissions: [] }, functionPermissions: permissions } } as unknown as ComponentProps<typeof ApiWorkspaceShell>["context"];
      const view = render(<ApiWorkspaceShell context={context}><h1>Nội dung</h1></ApiWorkspaceShell>);
      return [...within(view.container).getByRole("navigation", { name: "Chức năng" }).querySelectorAll("summary")].map((item) => item.textContent?.trim());
    };
    const zoneManager = staff([...["CULTIVATION_CYCLES", "WATER_MEASUREMENTS", "HARVESTS", "WORK_ASSIGNMENTS", "ATTENDANCE", "PURCHASE_RECEIPTS"].flatMap((code) => grant(code, crud, zones)), ...grant("SUPPLIERS", ["View"], all)]);
    expect(zoneManager[0]).toBe("Nuôi trồng");
    cleanup();
    const accountant = staff([...["CUSTOMER_PAYMENTS", "SUPPLIER_PAYMENTS", "CASH_BOOK", "SALES_REPORTS"].flatMap((code) => grant(code, crud, all)), ...grant("SUPPLIERS", ["View"], all)]);
    expect(accountant[0]).toBe("Sổ quỹ");
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
    // Tổng quan is a plain top-level link (active on /dashboard), not a one-item dropdown; the four pages that left the menu moved to settings or stay by URL.
    const overview = within(nav).getByRole("link", { name: "Tổng quan" });
    expect(overview.getAttribute("href")).toBe("/dashboard");
    expect(overview.getAttribute("aria-current")).toBe("page");
    expect(overview.closest("details")).toBeNull();
    expect(within(nav).queryByText("Điều hành")).toBeNull();
    for (const href of ["/audit", "/cooperative/certifications", "/operations/supplier-debts", "/trader-requests"]) expect(nav.querySelector(`a[href="${href}"]`)).toBeNull();
    expect(nav.querySelector('a[href="/cooperative/profile"]')).toBeNull();
    expect(nav.querySelector('a[href="/cooperative/receiving-bank-account"]')).toBeNull();
    const settings = within(view.container).getByRole("button", { name: "Cài đặt" });
    expect(settings.getAttribute("aria-expanded")).toBe("false");
    fireEvent.click(settings);
    expect(settings.getAttribute("aria-expanded")).toBe("true");
    expect(within(view.container).getByRole("link", { name: "Hồ sơ hợp tác xã" }).getAttribute("href")).toBe("/cooperative/profile");
    expect(within(view.container).getByRole("link", { name: "Ngân hàng nhận tiền" }).getAttribute("href")).toBe("/cooperative/receiving-bank-account");
    expect(within(view.container).getByRole("link", { name: "Chứng nhận HTX" }).getAttribute("href")).toBe("/cooperative/certifications");
    expect(within(view.container).getByRole("link", { name: "Nhật ký thao tác" }).getAttribute("href")).toBe("/audit");
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
