"use client";
import { useCallback } from "react";
import { SelectBox } from "@/components/ui/select-box";
import { useRemote } from "@/features/operations/ui";
import { UnitInput } from "@/components/form/unit-input";
import { fmt } from "@/features/purchase-documents/document-parts";
import { IN_USE, type ProductRow } from "@/features/products/contracts";
import { cageUnitOf } from "@/features/products/product-helpers";
import { productRepository } from "@/features/products/repository";
import styles from "./cultivation-flow.module.css";

/** The product line of a harvest trip (a lot holds one product): how many cages and how many kg. The kg follow cages × the product's Lồng factor while they are empty or still the value that rule gave; a kg typed over is kept. */
export type HarvestLine = { key: string; productId: string; cages: string; kg: string };
export type HarvestLinePayload = { productId: string; cageCount: number; kg: number | null };
type SavedLine = { productId: string; productCode: string; productName: string; cageCount: number; kg: number };

export const blankLine = (): HarvestLine => ({ key: crypto.randomUUID(), productId: "", cages: "", kg: "" });
/** The lines a lot already has, as the form starts from them; their stored kg are kept unless they still equal cages × the Lồng factor. */
export const linesFromLot = (lines: readonly SavedLine[]): HarvestLine[] => lines.map((line) => ({ key: crypto.randomUUID(), productId: line.productId, cages: String(line.cageCount), kg: String(line.kg) }));

const number = (value: string) => { const parsed = Number(value.replace(",", ".")); return value.trim() && Number.isFinite(parsed) ? parsed : null; };
const round2 = (value: number) => Math.round(value * 100) / 100;
const isTwoDecimals = (value: number) => Math.abs(value * 100 - Math.round(value * 100)) < 1e-6;

/** The products a trip line can name: those in use, plus the ones the lot or the cycle already has (they stay allowed even if no longer sold). */
export function useHarvestProducts(saved: readonly Pick<SavedLine, "productId" | "productCode" | "productName">[] = []) {
  const remote = useRemote<ProductRow[]>(useCallback((signal: AbortSignal) => productRepository.all({}, signal), []));
  const list = (remote.data ?? []).filter((product) => product.statusId === IN_USE || saved.some((line) => line.productId === product.id));
  const extra: ProductRow[] = saved.filter((line) => !list.some((product) => product.id === line.productId))
    .map((line) => ({ id: line.productId, code: line.productCode, name: line.productName, unitPrice: null, statusId: 0, status: "", rowVersion: "", unit: "kg", units: [], createdAt: "" }));
  return { products: [...list, ...extra], loading: remote.loading, error: remote.error, reload: remote.reload };
}

/** What is wrong with the lines, in the user's words; undefined when they can be sent. */
export function linesProblem(lines: readonly HarvestLine[], required: boolean): string | undefined {
  if (required && !lines.length) return "Thêm ít nhất một sản phẩm thu hoạch.";
  const seen = new Set<string>();
  for (const [index, line] of lines.entries()) {
    const position = index + 1, cages = number(line.cages), kg = number(line.kg);
    if (!line.productId) return `Dòng ${position}: chọn sản phẩm.`;
    if (seen.has(line.productId)) return `Dòng ${position}: mỗi sản phẩm chỉ có một dòng.`;
    seen.add(line.productId);
    if (cages === null || cages <= 0 || cages > 100_000 || !isTwoDecimals(cages)) return `Dòng ${position}: số lồng phải lớn hơn 0 và có tối đa 2 số lẻ (được nhập 0,5).`;
    if (line.kg.trim() && (kg === null || kg <= 0)) return `Dòng ${position}: số kg phải lớn hơn 0.`;
  }
  return undefined;
}
export const linesPayload = (lines: readonly HarvestLine[]): HarvestLinePayload[] => lines.map((line) => ({ productId: line.productId, cageCount: Number(line.cages), kg: number(line.kg) === null ? null : round2(number(line.kg)!) }));
export const linesTotals = (lines: readonly HarvestLine[]) => ({ cages: round2(lines.reduce((sum, line) => sum + (number(line.cages) ?? 0), 0)), kg: round2(lines.reduce((sum, line) => sum + (number(line.kg) ?? 0), 0)) });

/**
 * The product line of a harvest trip: a lot holds one product, the one the cycle farms, so the line shows that product (read only) with the cages (QuantityStepper) and the kg,
 * which follow cages × the product's Lồng factor until they are typed over. A product without a Lồng unit leaves the kg to the lot's kg per cage when empty.
 * A line that has no product yet (a cycle that has none) offers the product to pick; there is no way to add a second line or to remove one. A lot made before this rule that
 * still has several lines shows them all, so a correction does not drop one.
 */
export function HarvestProductLines({ lines, products, loading, error, disabled, hideKg = false, onChange }: {
  lines: HarvestLine[]; products: readonly ProductRow[]; loading?: boolean; error?: string; disabled?: boolean; /** The kg are not typed (a lot from a plan: they come from the port weighing). */ hideKg?: boolean; onChange(lines: HarvestLine[]): void;
}) {
  const factorOf = (productId: string) => cageUnitOf(products.find((product) => product.id === productId)?.units ?? [])?.factor;
  const autoKg = (productId: string, cages: string) => { const factor = factorOf(productId), count = number(cages); return factor && count && count > 0 ? String(round2(count * factor)) : ""; };
  const patch = (key: string, change: Partial<HarvestLine>) => onChange(lines.map((line) => line.key === key ? { ...line, ...change } : line));
  // Fills the kg only when they are empty or still what the rule gave for the old values, so a kg typed by hand (or stored from an earlier save) survives.
  const refill = (line: HarvestLine, productId: string, cages: string) => line.kg === "" || line.kg === autoKg(line.productId, line.cages) ? autoKg(productId, cages) : line.kg;
  const setProduct = (line: HarvestLine, productId: string) => patch(line.key, { productId, kg: refill(line, productId, line.cages) });
  const setCages = (line: HarvestLine, cages: string) => patch(line.key, { cages, kg: refill(line, line.productId, cages) });
  const totals = linesTotals(lines);
  return <div className={styles.productLines}>
    <table><thead><tr><th>Sản phẩm</th><th>Số lồng</th>{!hideKg && <th>Số kg</th>}</tr></thead>
      <tbody>{lines.map((line, index) => {
        const position = index + 1, factor = factorOf(line.productId), product = products.find((row) => row.id === line.productId);
        return <tr key={line.key}>
          <td>{line.productId
            ? <span aria-label={`Sản phẩm dòng ${position}`}>{product ? `${product.name}${product.code ? ` (${product.code})` : ""}` : loading ? "Đang tải…" : "Sản phẩm của chu kỳ"}</span>
            : <SelectBox aria-label={`Sản phẩm dòng ${position}`} className="omts-control" disabled={disabled || loading} value={line.productId} onChange={(event) => setProduct(line, event.target.value)}>
              <option value="">{loading ? "Đang tải…" : "Chọn sản phẩm"}</option>
              {products.map((row) => <option key={row.id} value={row.id}>{row.name} ({row.code})</option>)}
            </SelectBox>}</td>
          <td className={styles.cageCell}><UnitInput label={`Số lồng dòng ${position}`} unit="lồng" decimals={2} step={0.5} min={0.01} max={100000} disabled={disabled} value={number(line.cages)} onChange={(cages) => setCages(line, cages === null ? "" : String(cages))} /></td>
          {!hideKg && <td><input aria-label={`Số kg dòng ${position}`} className={`omts-control ${styles.kgInput}`} inputMode="decimal" disabled={disabled} value={line.kg}
            placeholder={factor ? undefined : "Theo kg/lồng của lô"} title={factor ? `1 lồng = ${fmt(factor)} kg; sửa được` : undefined}
            onChange={(event) => { const text = event.target.value.replace(/[^\d.,]/g, ""); patch(line.key, { kg: text }); }} /></td>}
        </tr>;
      })}</tbody>
      {lines.length > 1 && <tfoot><tr><th>Tổng</th><th>{fmt(totals.cages)} lồng</th>{!hideKg && <th>{fmt(Math.round(totals.kg * 100) / 100)} kg</th>}</tr></tfoot>}
    </table>
    {error && <p role="alert" className={styles.harvestHint}>Không tải được danh sách sản phẩm. {error}</p>}
  </div>;
}
