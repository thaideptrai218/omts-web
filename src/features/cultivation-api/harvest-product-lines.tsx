"use client";
import { useCallback } from "react";
import { InterfaceIcon } from "@/components/ui/interface-icon";
import { managementStyles } from "@/components/ui/management-screen/management-table";
import { SelectBox } from "@/components/ui/select-box";
import { useRemote } from "@/features/operations/ui";
import { QuantityStepper, fmt } from "@/features/purchase-documents/document-parts";
import { IN_USE, type ProductRow } from "@/features/products/contracts";
import { cageUnitOf } from "@/features/products/product-helpers";
import { productRepository } from "@/features/products/repository";
import styles from "./cultivation-flow.module.css";

/** One product of a harvest trip: how many cages and how many kg. The kg follow cages × the product's Lồng factor while they are empty or still the value that rule gave; a kg typed over is kept. */
export type HarvestLine = { key: string; productId: string; cages: string; kg: string };
export type HarvestLinePayload = { productId: string; cageCount: number; kg: number | null };
type SavedLine = { productId: string; productCode: string; productName: string; cageCount: number; kg: number };

export const blankLine = (): HarvestLine => ({ key: crypto.randomUUID(), productId: "", cages: "", kg: "" });
/** The lines a lot already has, as the form starts from them; their stored kg are kept unless they still equal cages × the Lồng factor. */
export const linesFromLot = (lines: readonly SavedLine[]): HarvestLine[] => lines.map((line) => ({ key: crypto.randomUUID(), productId: line.productId, cages: String(line.cageCount), kg: String(line.kg) }));

const number = (value: string) => { const parsed = Number(value.replace(",", ".")); return value.trim() && Number.isFinite(parsed) ? parsed : null; };
const round2 = (value: number) => Math.round(value * 100) / 100;

/** The products a trip can be split into: those in use, plus the ones a lot being corrected already has (they stay allowed even if no longer sold). */
export function useHarvestProducts(saved: readonly SavedLine[] = []) {
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
    if (cages === null || !Number.isInteger(cages) || cages <= 0) return `Dòng ${position}: số lồng phải là số nguyên lớn hơn 0.`;
    if (line.kg.trim() && (kg === null || kg <= 0)) return `Dòng ${position}: số kg phải lớn hơn 0.`;
  }
  return undefined;
}
export const linesPayload = (lines: readonly HarvestLine[]): HarvestLinePayload[] => lines.map((line) => ({ productId: line.productId, cageCount: Number(line.cages), kg: number(line.kg) === null ? null : round2(number(line.kg)!) }));
export const linesTotals = (lines: readonly HarvestLine[]) => ({ cages: lines.reduce((sum, line) => sum + (number(line.cages) ?? 0), 0), kg: lines.reduce((sum, line) => sum + (number(line.kg) ?? 0), 0) });

/**
 * The product lines of a harvest trip: the product, the cages (QuantityStepper) and the kg, which follow cages × the product's Lồng factor until they are
 * typed over. A product without a Lồng unit leaves the kg to the lot's kg per cage when empty.
 */
export function HarvestProductLines({ lines, products, loading, error, disabled, onChange }: {
  lines: HarvestLine[]; products: readonly ProductRow[]; loading?: boolean; error?: string; disabled?: boolean; onChange(lines: HarvestLine[]): void;
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
    <table><thead><tr><th>Sản phẩm</th><th>Số lồng</th><th>Số kg</th><th /></tr></thead>
      <tbody>{lines.map((line, index) => {
        const position = index + 1, factor = factorOf(line.productId);
        return <tr key={line.key}>
          <td><SelectBox aria-label={`Sản phẩm dòng ${position}`} className="omts-control" disabled={disabled || loading} value={line.productId} onChange={(event) => setProduct(line, event.target.value)}>
            <option value="">{loading ? "Đang tải…" : "Chọn sản phẩm"}</option>
            {products.filter((product) => product.id === line.productId || !lines.some((other) => other.productId === product.id)).map((product) => <option key={product.id} value={product.id}>{product.name} ({product.code})</option>)}
          </SelectBox></td>
          <td><QuantityStepper label={`số lồng dòng ${position}`} value={line.cages} onChange={(cages) => setCages(line, cages.replace(/[.,].*$/, ""))} /></td>
          <td><input aria-label={`Số kg dòng ${position}`} className={`omts-control ${styles.kgInput}`} inputMode="decimal" disabled={disabled} value={line.kg}
            placeholder={factor ? undefined : "Theo kg/lồng của lô"} title={factor ? `1 lồng = ${fmt(factor)} kg; sửa được` : undefined}
            onChange={(event) => { const text = event.target.value.replace(/[^\d.,]/g, ""); patch(line.key, { kg: text }); }} /></td>
          <td><button type="button" className={styles.lineRemove} disabled={disabled} aria-label={`Bỏ dòng ${position}`} title="Bỏ dòng" onClick={() => onChange(lines.filter((row) => row.key !== line.key))}><InterfaceIcon name="trash" /></button></td>
        </tr>;
      })}</tbody>
      <tfoot><tr><th>Tổng</th><th>{fmt(totals.cages)} lồng</th><th>{fmt(Math.round(totals.kg * 100) / 100)} kg</th><th /></tr></tfoot>
    </table>
    {error && <p role="alert" className={styles.harvestHint}>Không tải được danh sách sản phẩm. {error}</p>}
    <div><button type="button" className={managementStyles.linkButton} disabled={disabled} onClick={() => onChange([...lines, blankLine()])}>+ Thêm sản phẩm</button></div>
  </div>;
}
