// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { UnitCell } from "./unit-cell";
import { baseUnitOf, unitChoices, type ItemOption } from "./types";

const item: ItemOption = {
  id: "i1", code: "VT000001", name: "Phao nhựa", unit: "cái", group: "Material",
  units: [{ id: "u-base", name: "cái", factor: 1, code: "VT000001-C", isBase: true }, { id: "u-box", name: "thùng", factor: 12, code: "VT000001-T", isBase: false }],
};
afterEach(cleanup);

it("offers the item's units without explaining the conversion on the line", () => {
  const pick = vi.fn();
  render(<UnitCell line={{ item, itemUnitId: "u-box", unitName: "thùng", unitFactor: 12 }} index={0} onPick={pick} />);
  const select = screen.getByLabelText("Đơn vị tính dòng 1") as HTMLSelectElement;
  expect([...select.options].map((option) => option.textContent)).toEqual(["cái", "thùng"]);
  expect(select.value).toBe("u-box");
  expect(screen.queryByText(/1 = 12 cái/)).toBeNull();
  fireEvent.change(select, { target: { value: "u-base" } });
  expect(pick).toHaveBeenCalledWith("u-base");
});

it("keeps a line's own unit for an item the catalogue no longer lists, and locks a line that gave quantity away", () => {
  const gone: ItemOption = { ...item, units: [] };
  expect(unitChoices(gone, { itemUnitId: "u-box", unit: "thùng", unitFactor: 12 })).toEqual([{ id: "u-box", name: "thùng", factor: 12, code: "", isBase: false }]);
  expect(baseUnitOf(item)?.id).toBe("u-base");
  render(<UnitCell line={{ item, itemUnitId: "u-base", unitName: "cái", unitFactor: 1, floor: 5 }} index={1} onPick={vi.fn()} />);
  expect((screen.getByLabelText("Đơn vị tính dòng 2") as HTMLSelectElement).disabled).toBe(true);
});
