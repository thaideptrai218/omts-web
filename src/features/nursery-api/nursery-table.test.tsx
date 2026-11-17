// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { nurseryRowSchema } from "./contracts";
import { NurseryTable, nurseryColumns } from "./nursery-table";

afterEach(cleanup);
function mount(statusId: number, remaining: number) {
  const row = nurseryRowSchema.parse({ id: "n", code: "NU01", zoneId: "z", zoneCode: "KV01", zoneName: "Vùng 1", quantityIn: 1000,
    startDate: "2026-11-01", daysNursing: 12, statusId, rowVersion: "v1", survivors: 900, seeded: 300, remaining });
  render(<NurseryTable rows={[row]} visible={nurseryColumns.map(column => column.key)} sort={{ key: "code", direction: "asc" }}
    onSort={vi.fn()} onToggle={vi.fn()} detail={() => null} />);
}
describe("nursery inventory list", () => {
  it("shows seeded and remaining quantities with their column headings", () => {
    mount(4002, 600);
    expect(screen.getByRole("columnheader", { name: "Đã thả" })).toBeTruthy();
    expect(screen.getByRole("columnheader", { name: "Còn lại" })).toBeTruthy();
    expect(screen.getByText("300 mảnh")).toBeTruthy();
    expect(screen.getByText("600 mảnh")).toBeTruthy();
    expect(screen.getByText("Đã ươm xong")).toBeTruthy();
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
