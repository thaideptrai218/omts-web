// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { nurseryRowSchema } from "./contracts";
import { NurseryTable, defaultNurseryColumns, nurseryColumns } from "./nursery-table";

afterEach(cleanup);
function mount(statusId: number, remaining: number) {
  const row = nurseryRowSchema.parse({ id: "n", code: "NU01", zoneId: "z", zoneCode: "KV01", zoneName: "Vùng 1", quantityIn: 1000,
    startDate: "2026-11-01", daysNursing: 12, statusId, rowVersion: "v1", survivors: 900, seeded: 300, remaining });
  render(<NurseryTable rows={[row]} visible={nurseryColumns.map(column => column.key)} sort={{ key: "code", direction: "asc" }}
    onSort={vi.fn()} onToggle={vi.fn()} detail={() => null} />);
}
describe("nursery inventory list", () => {
  it("does not repeat the filtered zone on every row by default, and shows the seed name under the lot code", () => {
    expect(defaultNurseryColumns).not.toContain("zone");
    const row = nurseryRowSchema.parse({ id: "n", code: "NU01", zoneId: "z", zoneCode: "KV01", zoneName: "Vùng 1", quantityIn: 1000, seedLotCode: "PN1-1", itemName: "Giống hàu",
      startDate: "2026-11-01", daysNursing: 12, statusId: 4001, rowVersion: "v1" });
    render(<NurseryTable rows={[row]} visible={defaultNurseryColumns} sort={{ key: "code", direction: "asc" }} onSort={vi.fn()} onToggle={vi.fn()} detail={() => null} />);
    expect(screen.queryByText("KV01 · Vùng 1")).toBeNull();
    expect(screen.getByText("Giống hàu")).toBeTruthy();
  });
  it("shows seeded and remaining quantities with their column headings", () => {
    mount(4002, 600);
    expect(screen.getByRole("columnheader", { name: "Đã thả" })).toBeTruthy();
    expect(screen.getByRole("columnheader", { name: "Còn lại" })).toBeTruthy();
    expect(screen.getByText("300 mảnh")).toBeTruthy();
    expect(screen.getByText("600 mảnh")).toBeTruthy();
    expect(screen.getByText("Chờ thả")).toBeTruthy();
  });
  it("identifies an exhausted completed nursery", () => {
    mount(4002, 0);
    expect(screen.getByText("Đã thả hết")).toBeTruthy();
  });
  it("distinguishes closing from using all surviving pieces", () => {
    mount(4004, 0);
    expect(screen.getByText("Đã đóng")).toBeTruthy();
    expect(screen.getByText("0 mảnh")).toBeTruthy();
    expect(screen.queryByText("Đã thả hết")).toBeNull();
  });
});
