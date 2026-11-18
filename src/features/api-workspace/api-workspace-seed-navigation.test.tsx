// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, within } from "@testing-library/react";
import type { ComponentProps } from "react";
import { ApiWorkspaceShell } from "./api-workspace-shell";

vi.mock("next/navigation", () => ({ usePathname: () => "/dashboard", useSearchParams: () => new URLSearchParams() }));
vi.mock("@/features/auth/api/api-auth-client", () => ({ logoutWithApi: vi.fn() }));
vi.mock("@/features/inbox-api/inbox-bell", () => ({ InboxBell: () => null }));
vi.mock("@/features/trader-requests-api/requests-dialog", () => ({ TraderRequestsDialog: () => null }));
afterEach(cleanup);

function setup(subjectType: "CooperativeOwner" | "Staff", grants: { functionCode: string; action: string }[] = []) {
  const context = {
    identity: { accountId: "529ec3ce-af8f-42f7-a08f-4bab36ba7e62", username: "fixture", subjectType },
    permissions: { access: { permissions: [] }, functionPermissions: grants.map((grant) => ({ ...grant, dataScope: "AssignedZone", scope: { kind: "all-zones" } })) },
  } as unknown as ComponentProps<typeof ApiWorkspaceShell>["context"];
  const view = render(<ApiWorkspaceShell context={context}><h1>Nội dung</h1></ApiWorkspaceShell>);
  return within(view.container).getByRole("navigation", { name: "Chức năng" });
}
const open = (nav: HTMLElement, group: string) => { const details = within(nav).getByText(group, { exact: true }).closest("details")!; fireEvent.click(details.querySelector("summary")!); return details; };
const hrefs = (scope: HTMLElement) => [...scope.querySelectorAll("a")].map((link) => [link.textContent, link.getAttribute("href")]);

it("splits the catalogue and the purchase documents into Giống and Vật tư entries, with Lô giống next to Giống", () => {
  const nav = setup("CooperativeOwner");
  const inputs = open(nav, "Vật tư & Giống");
  expect(hrefs(inputs).slice(0, 3)).toEqual([["Giống", "/inputs/seeds"], ["Lô giống", "/farming/seed-lots"], ["Vật tư", "/inputs/supplies"]]);
  expect(inputs.querySelector('a[href="/inputs/items"]')).toBeNull();
  const buying = open(nav, "Mua hàng");
  expect(hrefs(buying)).toEqual(expect.arrayContaining([
    ["Nhập giống", "/operations/seed-receipts"], ["Nhập vật tư", "/operations/supply-receipts"], ["Trả giống nhập", "/operations/seed-returns"], ["Trả vật tư nhập", "/operations/supply-returns"],
  ]));
  expect(buying.querySelector('a[href="/operations/purchase-receipts"]')).toBeNull();
  expect(nav.querySelector('a[href="/operations/supplier-payments"]')).toBeNull();
});

it("groups Nuôi trồng into three titled columns and moves the report and tracing links out", () => {
  const nav = setup("CooperativeOwner");
  const farming = open(nav, "Nuôi trồng");
  const columns = [...farming.querySelectorAll("section")].map((section) => [section.querySelector("h3")!.textContent, hrefs(section).map(([label]) => label)]);
  expect(columns).toEqual([
    ["Cơ sở", ["Vùng nuôi", "Bè nuôi"]],
    ["Chu kỳ nuôi", ["Ươm giống", "Hành trình", "Chất lượng nước"]],
    ["Thu hoạch", ["Kế hoạch thu hoạch", "Lô thu hoạch"]],
  ]);
  for (const href of ["/operations/seeding", "/operations/harvest", "/operations/material-usages", "/farming/seed-lots", "/operations/harvest-yield", "/operations/lot-tracing"]) expect(farming.querySelector(`a[href="${href}"]`)).toBeNull();
  expect(hrefs(open(nav, "Báo cáo"))).toContainEqual(["Sản lượng nuôi", "/operations/harvest-yield"]);
  expect(hrefs(open(nav, "Kinh doanh"))).toContainEqual(["Truy xuất lô hàng", "/operations/lot-tracing"]);
});

it("shows Lô giống only to an account that reads the receipts", () => {
  const nav = setup("Staff", [{ functionCode: "CULTIVATION_CYCLES", action: "View" }]);
  expect(nav.querySelector('a[href="/farming/seed-lots"]')).toBeNull();
  cleanup();
  const receipts = setup("Staff", [{ functionCode: "PURCHASE_RECEIPTS", action: "View" }]);
  expect(receipts.querySelector('a[href="/farming/seed-lots"]')).not.toBeNull();
});
