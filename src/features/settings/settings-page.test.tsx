// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import type { ReactNode } from "react";
import { AppShell } from "@/components/layout/app-shell";
import type { SettingsSection } from "@/components/layout/header-menu";
import { SettingsPage } from "./settings-page";

vi.mock("next/navigation", () => ({ usePathname: () => "/settings" }));
afterEach(cleanup);

const sections: SettingsSection[] = [
  { label: "Phân quyền", items: [
    { href: "/workspace/accounts", label: "Tài khoản nhân viên nội bộ", icon: "id-card", description: "Trạng thái truy cập và vai trò theo vùng." },
    { href: "/workspace/roles", label: "Vai trò và quyền", icon: "roles", description: "Đối chiếu quyền hiện hành." },
  ] },
  { label: "Hợp tác xã", items: [{ href: "/cooperative/profile", label: "Hồ sơ hợp tác xã", icon: "cooperative", description: "Thông tin pháp lý và liên hệ." }] },
  { label: "Trống", items: [] },
];
const inShell = (list: readonly SettingsSection[], child: ReactNode = <SettingsPage />) => render(<AppShell settingsSections={list} onLogout={vi.fn()}>{child}</AppShell>);

describe("settings page", () => {
  it("lists the same permitted sections as the gear menu, each row linking to its real page", () => {
    inShell(sections);
    const main = within(screen.getByRole("main"));
    expect(main.getByRole("heading", { level: 1, name: "Thiết lập" })).toBeTruthy();
    expect(main.getByRole("heading", { level: 2, name: "Phân quyền" })).toBeTruthy();
    expect(main.queryByRole("heading", { name: "Trống" })).toBeNull();
    const row = main.getByRole("link", { name: /Hồ sơ hợp tác xã/ });
    expect(row.getAttribute("href")).toBe("/cooperative/profile");
    expect(row.textContent).toContain("Thông tin pháp lý và liên hệ.");
    expect(main.getAllByRole("link", { name: /Vai trò và quyền/ })[0].getAttribute("href")).toBe("/workspace/roles");
    const sidebar = main.getByRole("navigation", { name: "Nhóm thiết lập" });
    expect(within(sidebar).getAllByRole("link").map((link) => link.textContent)).toEqual(["Phân quyền", "Hợp tác xã"]);
  });
  it("filters rows by title and description without regard to Vietnamese accents", () => {
    inShell(sections);
    const search = screen.getByRole("searchbox", { name: "Tìm kiếm thiết lập" });
    fireEvent.change(search, { target: { value: "phap ly" } });
    const main = within(screen.getByRole("main"));
    expect(main.getByRole("link", { name: /Hồ sơ hợp tác xã/ })).toBeTruthy();
    expect(main.queryByRole("link", { name: /Vai trò và quyền/ })).toBeNull();
    expect(main.queryByRole("heading", { level: 2, name: "Phân quyền" })).toBeNull();
    fireEvent.change(search, { target: { value: "VAI TRO" } });
    expect(main.getByRole("link", { name: /Vai trò và quyền/ })).toBeTruthy();
    expect(main.queryByRole("link", { name: /Hồ sơ hợp tác xã/ })).toBeNull();
  });
  it("explains when nothing matches the search", () => {
    inShell(sections);
    fireEvent.change(screen.getByRole("searchbox", { name: "Tìm kiếm thiết lập" }), { target: { value: "khong co gi" } });
    expect(screen.getByRole("status").textContent).toContain("Không tìm thấy thiết lập phù hợp");
    expect(screen.queryByRole("link", { name: /Hồ sơ hợp tác xã/ })).toBeNull();
  });
  it("shows an empty state, no search and no gear when the account has no settings", () => {
    inShell([{ label: "Trống", items: [] }]);
    expect(screen.getByRole("status").textContent).toContain("chưa có thiết lập nào");
    expect(screen.queryByRole("searchbox")).toBeNull();
    expect(screen.queryByRole("button", { name: "Cài đặt" })).toBeNull();
  });
  it("highlights the section chosen in the sidebar", () => {
    inShell(sections);
    const sidebar = within(screen.getByRole("navigation", { name: "Nhóm thiết lập" }));
    const coop = sidebar.getByRole("link", { name: "Hợp tác xã" });
    expect(sidebar.getByRole("link", { name: "Phân quyền" }).getAttribute("aria-current")).toBe("true");
    fireEvent.click(coop);
    expect(coop.getAttribute("aria-current")).toBe("true");
    expect(sidebar.getByRole("link", { name: "Phân quyền" }).getAttribute("aria-current")).toBeNull();
  });
});
