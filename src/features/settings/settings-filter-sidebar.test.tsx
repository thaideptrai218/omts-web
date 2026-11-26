// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { useState } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { FilterHead, FilterPills, ManagementLayout } from "@/components/ui/management-screen/management-layout";
import { buildSettingsGroups, type SettingsGate } from "./settings-hub-groups";

const nav = vi.hoisted(() => ({ path: "/audit" }));
vi.mock("next/navigation", () => ({
  usePathname: () => nav.path,
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));
afterEach(() => { cleanup(); nav.path = "/audit"; window.localStorage.clear(); vi.unstubAllGlobals(); });

const owner: SettingsGate = { isOwner: true, holds: () => true, operation: () => true, canReadProducts: true };

function ListScreen() {
  const [value, setValue] = useState("");
  return <ManagementLayout storageKey="test-list" icon="search" title="Danh sách thử" actions={null} filterLabel="Bộ lọc thử" filtersActive={!!value}
    filters={<>
      <FilterHead canReset={!!value} onReset={() => setValue("")} />
      <FilterPills legend="Trạng thái" name="state" value={value} options={[["on", "Đang dùng"]]} onChange={setValue} />
    </>}>
    <p>Giá trị lọc: {value || "không"}</p>
  </ManagementLayout>;
}

const show = () => render(<AppShell settingsSections={buildSettingsGroups(owner)} onLogout={vi.fn()}><ListScreen /></AppShell>);
const settingsList = () => screen.queryByRole("navigation", { name: "Nhóm thiết lập" });
const panel = () => screen.queryByRole("complementary", { name: "Bộ lọc thử" });
const toggle = () => screen.getByRole("button", { name: /^Lọc/ });

describe("list filters inside the settings frame", () => {
  it("hides the filters until Lọc, then shows them in place of the settings list", () => {
    show();
    expect(panel()).toBeNull();
    expect(screen.queryByRole("button", { name: "Hiện bộ lọc" })).toBeNull();
    expect(settingsList()).toBeTruthy();
    expect(toggle().getAttribute("aria-expanded")).toBe("false");
    fireEvent.click(toggle());
    expect(settingsList()).toBeNull();
    expect(toggle().getAttribute("aria-expanded")).toBe("true");
    // In the sidebar column, not inside the list screen.
    expect(panel()!.closest("[data-management-screen]")).toBeNull();
    expect(document.activeElement).toBe(panel());
    expect(screen.queryByRole("button", { name: "Ẩn bộ lọc" })).toBeNull();
  });

  it.each([
    ["Đóng", () => fireEvent.click(screen.getByRole("button", { name: "Đóng bộ lọc" }))],
    ["Lọc again", () => fireEvent.click(toggle())],
    ["Escape in the panel", () => fireEvent.keyDown(panel()!, { key: "Escape" })],
    ["Escape on the button", () => fireEvent.keyDown(toggle(), { key: "Escape" })],
  ])("brings the settings list back with %s and returns focus to Lọc", (_, close) => {
    show();
    fireEvent.click(toggle());
    close();
    expect(panel()).toBeNull();
    expect(settingsList()).toBeTruthy();
    expect(document.activeElement).toBe(toggle());
  });

  it("keeps the chosen filter while closed, marks the button, and Đặt lại clears it", () => {
    show();
    fireEvent.click(toggle());
    fireEvent.click(screen.getByLabelText("Đang dùng"));
    fireEvent.click(screen.getByRole("button", { name: "Đóng bộ lọc" }));
    expect(screen.getByText("Giá trị lọc: on")).toBeTruthy();
    expect(toggle().textContent).toContain("đang lọc");
    fireEvent.click(toggle());
    fireEvent.click(within(panel()!).getByRole("button", { name: "Đặt lại" }));
    expect(screen.getByText("Giá trị lọc: không")).toBeTruthy();
    expect(toggle().textContent).toBe("Lọc");
  });

  it("expands a collapsed settings list while filtering and collapses it again", () => {
    window.localStorage.setItem("omts.settings-sidebar.collapsed", "1");
    show();
    const layout = () => document.querySelector("[data-guide=\"settings-content\"]")!.parentElement!;
    const collapsed = layout().className;
    fireEvent.click(toggle());
    expect(layout().className).not.toBe(collapsed);
    fireEvent.click(toggle());
    expect(layout().className).toBe(collapsed);
  });

  it("uses the drawer on phones and leaves the settings column alone", () => {
    vi.stubGlobal("matchMedia", () => ({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() }));
    show();
    expect(panel()).toBeNull();
    fireEvent.click(toggle());
    expect(panel()!.closest("[data-management-screen]")).toBeTruthy();
    expect(settingsList()).toBeTruthy();
    fireEvent.click(within(panel()!).getByRole("button", { name: "Đóng" }));
    expect(panel()).toBeNull();
    expect(document.activeElement).toBe(toggle());
  });

  it("keeps the usual filter rail outside settings", () => {
    nav.path = "/dashboard";
    show();
    expect(panel()!.closest("[data-management-screen]")).toBeTruthy();
    expect(screen.queryByRole("button", { name: /^Lọc/ })).toBeNull();
    expect(screen.queryByRole("button", { name: "Đóng bộ lọc" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Ẩn bộ lọc" }));
    expect(panel()).toBeNull();
    expect(screen.getByRole("button", { name: "Hiện bộ lọc" })).toBeTruthy();
  });
});
