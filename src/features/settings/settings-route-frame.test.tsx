// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { AppShell } from "@/components/layout/app-shell";
import { buildSettingsGroups, type SettingsGate } from "./settings-hub-groups";

const nav = vi.hoisted(() => ({ path: "/", pushed: "" }));
vi.mock("next/navigation", () => ({
  usePathname: () => nav.path,
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ push: (href: string) => { nav.pushed = href; }, replace: vi.fn() }),
}));
afterEach(() => { cleanup(); nav.path = "/"; nav.pushed = ""; });

const owner: SettingsGate = { isOwner: true, holds: () => true, operation: () => true, resource: () => true, canReadProducts: true };
/** Accountant-like viewer: only the cash book settings; every other gear item is hidden. */
const accountant: SettingsGate = { isOwner: false, holds: (fn, action) => fn === "CASH_BOOK_SETTINGS" && action === "Edit", operation: () => false, resource: () => false, canReadProducts: false };
const show = (gate: SettingsGate) => render(<AppShell settingsSections={buildSettingsGroups(gate)} onLogout={vi.fn()}><h1>Trang đích</h1></AppShell>);
const sidebar = () => within(screen.getByRole("navigation", { name: "Nhóm thiết lập" }));

describe("settings sidebar on gear destinations", () => {
  const ownPages = buildSettingsGroups(owner).flatMap((group) => group.items).filter((item) => !item.panel);

  it.each(ownPages.map((item) => [item.label, item.href] as const))("%s opens with the shared sidebar and its own tab selected", (label, href) => {
    nav.path = href;
    show(owner);
    const current = sidebar().getAllByRole("link").filter((link) => link.getAttribute("aria-current") === "page");
    expect(current.map((link) => link.textContent)).toEqual([label]);
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(sidebar().getAllByRole("link").length).toBe(buildSettingsGroups(owner).flatMap((group) => group.items).length);
  });

  it("keeps a sub-page of a destination under the same selected tab", () => {
    nav.path = "/workspace/accounts/abc";
    show(owner);
    expect(sidebar().getByRole("link", { name: "Quản lý người dùng" }).getAttribute("aria-current")).toBe("page");
  });

  it("leaves pages that are not gear destinations without the sidebar", () => {
    nav.path = "/dashboard";
    show(owner);
    expect(screen.queryByRole("navigation", { name: "Nhóm thiết lập" })).toBeNull();
    expect(screen.getByRole("heading", { name: "Trang đích" })).toBeTruthy();
  });

  it("lists only permitted items, and a destination the viewer may not use gets no sidebar", () => {
    nav.path = "/workspace/accounts";
    show(accountant);
    expect(screen.queryByRole("navigation", { name: "Nhóm thiết lập" })).toBeNull();
    cleanup();
    nav.path = "/";
    show(accountant);
    fireEvent.click(screen.getByRole("button", { name: "Cài đặt" }));
    expect(screen.queryByRole("link", { name: "Quản lý người dùng" })).toBeNull();
  });

  it("offers the same items in a select for narrow screens and navigates on change", () => {
    nav.path = "/cooperative/profile";
    show(owner);
    const picker = screen.getByRole("combobox", { name: "Chọn thiết lập" }) as HTMLSelectElement;
    expect(picker.value).toBe("/cooperative/profile");
    fireEvent.change(picker, { target: { value: "/workspace/roles" } });
    expect(nav.pushed).toBe("/workspace/roles");
  });
});
