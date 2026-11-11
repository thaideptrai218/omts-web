// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { afterEach, expect, it } from "vitest";
import type { ProductRow } from "@/features/products/contracts";
import { HarvestProductLines, blankLine, linesPayload, linesProblem, type HarvestLine } from "./harvest-product-lines";

const id = (n: number) => `00000000-0000-4000-8000-00000000000${n}`;
const product = (n: number, name: string, cageKg?: number): ProductRow => ({ id: id(n), code: `SP00000${n}`, name, unitPrice: 1000, statusId: 101, status: "In Use", rowVersion: "v", unit: "kg", createdAt: "x",
  units: [{ id: id(10 + n), unitId: id(20), name: "kg", factor: 1, code: "K", isBase: true }, ...(cageKg ? [{ id: id(30 + n), unitId: id(21), name: "Lồng", factor: cageKg, code: "L", isBase: false }] : [])] });
const products = [product(1, "Hàu sữa", 25), product(2, "Hàu béo")];
afterEach(cleanup);

function Harness({ onChange }: { onChange?(lines: HarvestLine[]): void }) {
  const [lines, setLines] = useState<HarvestLine[]>(() => [blankLine()]);
  return <HarvestProductLines lines={lines} products={products} onChange={(next) => { setLines(next); onChange?.(next); }} />;
}

it("fills the kg from cages times the Lồng factor of the product and lets the kg be typed over", async () => {
  let latest: HarvestLine[] = [];
  render(<Harness onChange={(lines) => { latest = lines; }} />);
  await userEvent.selectOptions(screen.getByLabelText("Sản phẩm dòng 1"), id(1));
  await userEvent.type(screen.getByLabelText("số lồng dòng 1"), "4");
  expect((screen.getByLabelText("Số kg dòng 1") as HTMLInputElement).value).toBe("100");
  await userEvent.click(screen.getByLabelText("Tăng số lồng dòng 1"));
  expect((screen.getByLabelText("Số kg dòng 1") as HTMLInputElement).value).toBe("125");
  await userEvent.clear(screen.getByLabelText("Số kg dòng 1"));
  await userEvent.type(screen.getByLabelText("Số kg dòng 1"), "118");
  await userEvent.click(screen.getByLabelText("Tăng số lồng dòng 1"));
  expect((screen.getByLabelText("Số kg dòng 1") as HTMLInputElement).value).toBe("118");
  expect(linesPayload(latest)).toEqual([{ productId: id(1), cageCount: 6, kg: 118 }]);
});

it("leaves the kg empty for a product without a Lồng unit and names the first problem of the lines", async () => {
  render(<Harness />);
  await userEvent.selectOptions(screen.getByLabelText("Sản phẩm dòng 1"), id(2));
  await userEvent.type(screen.getByLabelText("số lồng dòng 1"), "3");
  expect((screen.getByLabelText("Số kg dòng 1") as HTMLInputElement).value).toBe("");
  expect(linesProblem([], true)).toBe("Thêm ít nhất một sản phẩm thu hoạch.");
  expect(linesProblem([blankLine()], true)).toBe("Dòng 1: chọn sản phẩm.");
  expect(linesProblem([{ ...blankLine(), productId: id(1), cages: "2" }, { ...blankLine(), productId: id(1), cages: "1" }], true)).toBe("Dòng 2: mỗi sản phẩm chỉ có một dòng.");
});
