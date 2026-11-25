// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import type { ReactNode } from "react";
import { AppShell } from "@/components/layout/app-shell";
import type { SettingsSection } from "@/components/layout/header-menu";
import { SettingsPage } from "./settings-page";

const nav = vi.hoisted(() => ({ section: null as string | null, pushed: null as string | null }));
vi.mock("next/navigation", () => ({
  usePathname: () => "/settings",
  useSearchParams: () => new URLSearchParams(nav.section ? { section: nav.section } : {}),
  useRouter: () => ({ replace: (href: string) => { nav.section = new URL(href, "http://x").searchParams.get("section"); }, push: (href: string) => { nav.pushed = href; } }),
}));
vi.mock("@/features/cash-book/cash-settings", () => ({ CashBookSettings: () => <p>Nội dung sổ quỹ</p> }));
vi.mock("@/features/input-items/inventory-settings", () => ({ InputInventorySettings: () => <p>Nội dung vật tư</p> }));
afterEach(() => { cleanup(); nav.section = null; });

const sections: SettingsSection[] = [
  { label: "Quản lý", items: [{ href: "/settings?section=cash-book", panel: "cash-book", label: "Sổ quỹ", icon: "payment", description: "Tài khoản và loại thu chi." }] },
  { label: "Phân quyền", items: [
    { href: "/workspace/accounts", label: "Tài khoản nhân viên nội bộ", icon: "id-card", description: "Trạng thái truy cập và vai trò theo vùng." },
    { href: "/workspace/roles", label: "Vai trò và quyền", icon: "roles", description: "Đối chiếu quyền hiện hành." },
  ] },
  { label: "Hợp tác xã", items: [{ href: "/cooperative/profile", label: "Hồ sơ hợp tác xã", icon: "cooperative", description: "Thông tin pháp lý và liên hệ." }] },
  { label: "Trống", items: [] },
];
const inShell = (list: readonly SettingsSection[], child: ReactNode = <SettingsPage />) => render(<AppShell settingsSections={list} onLogout={vi.fn()}>{child}</AppShell>);
const sidebar = () => within(screen.getByRole("navigation", { name: "Nhóm thiết lập" }));

describe("settings page", () => {
  it("groups the permitted items on the left and shows the first one in place", () => {
    inShell(sections);
    expect(screen.getByRole("heading", { level: 1, name: "Cài đặt" })).toBeTruthy();
    expect(sidebar().getAllByRole("heading").map((heading) => heading.textContent)).toEqual(["Quản lý", "Phân quyền", "Hợp tác xã"]);
    expect(sidebar().getByRole("button", { name: "Sổ quỹ" }).getAttribute("aria-current")).toBe("true");
    expect(screen.getByText("Nội dung sổ quỹ")).toBeTruthy();
  });
  it("opens a settings panel on the right without leaving the page, and a page item at once with no extra step", () => {
    const view = inShell(sections);
    nav.pushed = null;
    fireEvent.click(sidebar().getByRole("button", { name: "Hồ sơ hợp tác xã" }));
    expect(nav.pushed).toBe("/cooperative/profile");
    expect(screen.queryByRole("link", { name: /^Mở / })).toBeNull();
    fireEvent.click(sidebar().getByRole("button", { name: "Sổ quỹ" }));
    view.rerender(<AppShell settingsSections={sections} onLogout={vi.fn()}><SettingsPage /></AppShell>);
    expect(nav.section).toBe("cash-book");
    expect(screen.getByText("Nội dung sổ quỹ")).toBeTruthy();
  });
  it("filters items by title and description without regard to Vietnamese accents", () => {
    inShell(sections);
    fireEvent.change(screen.getByRole("searchbox", { name: "Tìm kiếm thiết lập" }), { target: { value: "VAI TRO" } });
    expect(sidebar().getByRole("button", { name: "Vai trò và quyền" })).toBeTruthy();
    expect(sidebar().queryByRole("button", { name: "Sổ quỹ" })).toBeNull();
  });
  it("explains when nothing matches the search", () => {
    inShell(sections);
    fireEvent.change(screen.getByRole("searchbox", { name: "Tìm kiếm thiết lập" }), { target: { value: "khong co gi" } });
    expect(screen.getByRole("status").textContent).toContain("Không tìm thấy thiết lập phù hợp");
  });
  it("offers suggestions instead of a dead end and selects the chosen one", () => {
    inShell(sections);
    fireEvent.change(screen.getByRole("searchbox", { name: "Tìm kiếm thiết lập" }), { target: { value: "khong co gi" } });
    expect(screen.getByRole("status").textContent).toContain("Thử:");
    fireEvent.click(within(screen.getByRole("status")).getByRole("button", { name: "Tài khoản nhân viên nội bộ" }));
    expect(nav.pushed).toBe("/workspace/accounts");
  });
  it("finds an item by a synonym and shows its hint while searching, without jumping away", () => {
    const withKeywords: SettingsSection[] = [{ label: "Người dùng", items: [{ href: "/workspace/accounts", label: "Quản lý người dùng", icon: "id-card", keywords: ["mật khẩu"], hint: "Tạo tài khoản.", editor: "Chỉ chủ hợp tác xã sửa được" }] }, ...sections];
    inShell(withKeywords);
    fireEvent.change(screen.getByRole("searchbox", { name: "Tìm kiếm thiết lập" }), { target: { value: "mat khau" } });
    expect(sidebar().getByRole("button", { name: "Quản lý người dùng" })).toBeTruthy();
    const panel = within(screen.getByRole("region", { name: "Quản lý người dùng" }));
    expect(panel.getByText("Tạo tài khoản.")).toBeTruthy();
    expect(panel.getByText("Chỉ chủ hợp tác xã sửa được")).toBeTruthy();
    expect(panel.queryByRole("link", { name: /^Mở / })).toBeNull();
  });
  it("works with a single item: shows it in place and drops the pointless search box", () => {
    inShell([sections[0]]);
    expect(screen.getByText("Nội dung sổ quỹ")).toBeTruthy();
    expect(screen.queryByRole("searchbox")).toBeNull();
    expect(screen.getByRole("button", { name: "Cài đặt" })).toBeTruthy();
  });
  it("explains the empty hub and links back to the overview", () => {
    inShell([{ label: "Trống", items: [] }]);
    expect(screen.getByRole("status").textContent).toContain("Bạn chưa có thiết lập nào để chỉnh");
    expect(screen.getByRole("link", { name: "Về tổng quan" }).getAttribute("href")).toBe("/dashboard");
  });
  it("shows an empty state, no search and no gear when the account has no settings", () => {
    inShell([{ label: "Trống", items: [] }]);
    expect(screen.getByRole("status").textContent).toContain("chưa có thiết lập nào");
    expect(screen.queryByRole("searchbox")).toBeNull();
    expect(screen.queryByRole("button", { name: "Cài đặt" })).toBeNull();
  });
});
