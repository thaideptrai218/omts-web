// @vitest-environment jsdom
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";

vi.mock("./use-purchase-report", () => ({ usePurchaseLines: () => ({ data: null, loading: false, error: undefined, reload: vi.fn() }) }));
import { SupplierPurchasesPanel } from "./supplier-purchases-panel";
import { purchaseReport } from "./supplier-report-contracts";

const figures = { receiptCount: 1, returnCount: 0, receivedValue: 100_000, returnedValue: 0, netValue: 110_000, receivedQuantity: null, returnedQuantity: null };
const report = (vat?: { group: number; total: number }) => purchaseReport.parse({
  computedAt: "2026-11-28T00:00:00+07:00", from: "2026-11-01", to: "2026-11-28", groupBy: "supplier", filters: { suppliers: [], kind: "all" },
  groups: [{ key: "a", label: "Công ty Phao", code: null, unit: null, ...figures, ...(vat ? { vatAmount: vat.group } : {}) }],
  totals: { ...figures, ...(vat ? { vatAmount: vat.total } : {}) }, message: null, messageCode: null,
});
const plain = (node: HTMLElement) => node.textContent!.replace(/\s*₫\s*/, "");
const panel = (value: ReturnType<typeof report>) => render(<SupplierPurchasesPanel report={value} params={{}} groupBy="supplier" view="table" onView={vi.fn()} search="" />);
afterEach(cleanup);

it("shows Tiền hàng, Thuế GTGT and Tổng trả NCC per supplier and in the total row", () => {
  panel(report({ group: 10_000, total: 10_000 }));
  const table = screen.getByRole("table");
  expect(within(table).getAllByRole("columnheader").map((header) => header.textContent)).toEqual(["Nhà cung cấp", "Số phiếu nhập", "Số phiếu trả", "Tiền hàng", "Thuế GTGT", "Giá trị trả", "Tổng trả NCC"]);
  const row = within(table).getByText("Công ty Phao").closest("tr")!;
  expect(within(row).getAllByRole("cell").map(plain)).toEqual(["1", "0", "100.000", "10.000", "0", "110.000"]);
  expect(within(screen.getByLabelText("Tổng hợp toàn kỳ")).getByText("Thuế GTGT").nextElementSibling!.textContent).toContain("10.000");
});

it("reads a report of an API without input VAT as 0 VAT instead of failing", () => {
  panel(report());
  const row = screen.getByText("Công ty Phao").closest("tr")!;
  expect(within(row).getAllByRole("cell").map(plain)[3]).toBe("0");
});
