"use client";
import { fmt, viDateTime } from "@/features/purchase-documents/document-parts";
import type { CageSheet } from "./cage-contracts";
import { sumKg, weighComparison } from "./cage-weighing-math";

const signed = (value: number, suffix: string) => `${value > 0 ? "+" : value < 0 ? "−" : ""}${fmt(Math.abs(value))}${suffix}`;

/** The running total of the cages, the sum per product and the difference with what was brought up (cages x kg per cage, only an estimate). */
export function CageSheetTotals({ sheet }: { sheet: CageSheet }) {
  const total = sumKg(sheet.cages.map((cage) => cage.kg)), compared = sheet.cages.length ? weighComparison(sheet.estimatedKg, total) : null;
  return <section aria-label="Tổng số cân" className="grid gap-3 rounded-control border border-border bg-surface-subtle p-3 sm:p-4">
    <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
      <p className="text-sm text-text-muted">Đã cân {fmt(sheet.cages.length)}{sheet.harvestedCages > 0 ? ` / ${fmt(sheet.harvestedCages)}` : ""} lồng</p>
      <p className="text-2xl font-semibold tabular-nums" aria-label={`Tổng đã cân ${fmt(total)} kg`}>{fmt(total)} kg</p>
    </div>
    {compared && <p role="status" aria-label="So sánh với số mang lên" className="text-sm">So với số mang lên (≈ {fmt(sheet.estimatedKg)} kg): <strong className="tabular-nums">{signed(compared.difference, " kg")}{compared.percent === null ? "" : ` (${signed(compared.percent, "%")})`}</strong></p>}
    {sheet.products.length > 1 && <ul className="grid gap-1 text-sm" aria-label="Tổng theo sản phẩm">
      {sheet.products.map((product) => {
        const cages = sheet.cages.filter((cage) => cage.productId === product.productId);
        return <li key={product.productId} className="flex justify-between gap-3"><span>{product.productName}: {fmt(cages.length)}{product.harvestedCages > 0 ? ` / ${fmt(product.harvestedCages)}` : ""} lồng</span><strong className="tabular-nums">{fmt(sumKg(cages.map((cage) => cage.kg)))} kg</strong></li>;
      })}
    </ul>}
  </section>;
}

/**
 * What the trader's scale says, read only: the trader's total against ours and whether the trader has agreed to the weighing. The cages themselves are side by side in the table.
 */
export function CageTraderStatus({ sheet }: { sheet: CageSheet }) {
  if (!sheet.traderName) return null;
  const ours = sumKg(sheet.cages.map((cage) => cage.kg)), theirs = sheet.traderCagesKg ?? sumKg(sheet.traderCages.map((cage) => cage.kg)), difference = Math.round((theirs - ours) * 1000) / 1000;
  const agreed = sheet.agreement?.agreedAt;
  return <section aria-label="Thương lái cân" className="grid gap-1 rounded-control border border-border p-3 text-sm sm:p-4">
    <p><strong>Thương lái cân</strong>: {sheet.traderName}{sheet.orderCodes.length ? ` · ${sheet.orderCodes.join(", ")}` : ""}</p>
    <p>{fmt(sheet.traderCages.length)} lồng, <strong className="tabular-nums">{fmt(theirs)} kg</strong>{sheet.traderCages.length > 0 && <> · so với bên mình: <strong className={difference ? "text-danger" : undefined}>{difference ? signed(difference, " kg") : "khớp"}</strong></>}</p>
    {agreed
      ? <p role="status" className="text-success">Thương lái đã đồng ý lúc {viDateTime(agreed)}{sheet.agreement?.agreedKg != null ? ` (${fmt(sheet.agreement.agreedKg)} kg)` : ""}</p>
      : sheet.needsAgreement && <p role="status" className="text-warning">Chờ thương lái đồng ý</p>}
  </section>;
}
