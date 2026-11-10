// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
const state = vi.hoisted(() => ({ list: vi.fn() }));
vi.mock("next/navigation", () => ({ usePathname: () => "/dashboard" }));
vi.mock("./workspace-repository", () => ({ createWorkspaceRepository: (resource: string) => ({ list: (query: unknown) => state.list(resource, query) }) }));
import { SelectedZonesProvider } from "./selected-zones";
import { ZonePicker } from "./zone-picker";

const rows = (names: string[]) => ({ status: "success", data: { items: names.map((name, index) => ({ id: `z${index + 1}`, name })), page: 1, pageSize: 100, total: names.length } });
const setup = (enabled = true) => render(<SelectedZonesProvider accountId="acc-1" enabled={enabled}><ZonePicker /></SelectedZonesProvider>);
beforeEach(() => localStorage.clear());
afterEach(() => { cleanup(); vi.clearAllMocks(); });

describe("header zone picker", () => {
  it("shows all zones by default and lets the user pick a subset", async () => {
    state.list.mockResolvedValue(rows(["Ngọc Vừng", "Minh Châu", "Quan Lạn"]));
    setup();
    const chip = await screen.findByRole("button", { name: "Khu nuôi: Tất cả khu nuôi" });
    fireEvent.click(chip);
    fireEvent.click(screen.getByRole("checkbox", { name: "Quan Lạn" }));
    expect(screen.getByRole("button", { name: "Khu nuôi: Ngọc Vừng và Minh Châu" })).toBeTruthy();
    fireEvent.click(screen.getByRole("checkbox", { name: "Minh Châu" }));
    expect(screen.getByRole("button", { name: "Khu nuôi: Ngọc Vừng" })).toBeTruthy();
    expect((screen.getByRole("checkbox", { name: "Ngọc Vừng" }) as HTMLInputElement).disabled).toBe(true);
    fireEvent.click(screen.getByRole("checkbox", { name: "Tất cả khu nuôi" }));
    expect(screen.getByRole("button", { name: "Khu nuôi: Tất cả khu nuôi" })).toBeTruthy();
  });
  it("persists the choice and drops zones that are no longer visible", async () => {
    state.list.mockResolvedValue(rows(["Ngọc Vừng", "Minh Châu", "Quan Lạn"]));
    const first = setup();
    fireEvent.click(await screen.findByRole("button", { name: /^Khu nuôi:/ }));
    fireEvent.click(screen.getByRole("checkbox", { name: "Ngọc Vừng" }));
    expect(JSON.parse(localStorage.getItem("omts.selected-zones.v1.acc-1")!)).toEqual({ kind: "ids", ids: ["z2", "z3"] });
    first.unmount();
    state.list.mockResolvedValue(rows(["Minh Châu", "Quan Lạn"]));
    setup();
    // Only z2 survives from the saved choice [z2, z3]; z3 is no longer visible.
    expect(await screen.findByRole("button", { name: "Khu nuôi: Quan Lạn" })).toBeTruthy();
  });
  it("shows a loading chip, then a retry when the zones cannot be loaded", async () => {
    state.list.mockResolvedValue({ status: "error", httpStatus: 503, uncertain: false });
    setup();
    expect(screen.getByRole("status", { name: "Đang tải khu nuôi" })).toBeTruthy();
    const retry = await screen.findByRole("button", { name: "Không tải được danh sách khu nuôi. Thử lại" });
    state.list.mockResolvedValue(rows(["A", "B"]));
    fireEvent.click(retry);
    expect(await screen.findByRole("button", { name: "Khu nuôi: Tất cả khu nuôi" })).toBeTruthy();
  });
  it("is a static label for one zone and absent for none or when disabled", async () => {
    state.list.mockResolvedValue(rows(["Ngọc Vừng"]));
    const one = setup();
    expect(await screen.findByText("Ngọc Vừng")).toBeTruthy();
    expect(screen.queryByRole("button")).toBeNull();
    one.unmount();
    state.list.mockResolvedValue(rows([]));
    const none = setup();
    await vi.waitFor(() => expect(state.list).toHaveBeenCalledTimes(2));
    expect(none.container.textContent).toBe("");
    none.unmount();
    state.list.mockClear();
    const off = setup(false);
    expect(state.list).not.toHaveBeenCalled();
    expect(off.container.textContent).toBe("");
  });
  it("closes on Escape like the other header menus", async () => {
    state.list.mockResolvedValue(rows(["A", "B"]));
    setup();
    const chip = await screen.findByRole("button", { name: /^Khu nuôi:/ });
    fireEvent.click(chip);
    expect(chip.getAttribute("aria-expanded")).toBe("true");
    fireEvent.keyDown(chip, { key: "Escape" });
    expect(chip.getAttribute("aria-expanded")).toBe("false");
  });
});
