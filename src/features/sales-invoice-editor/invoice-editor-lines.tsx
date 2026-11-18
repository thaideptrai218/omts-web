"use client";
import Link from "next/link";
import { useState } from "react";
import { InterfaceIcon } from "@/components/ui/interface-icon";
import { MoneyInput, QuantityStepper, fmt } from "@/features/purchase-documents/document-parts";
import purchaseStyles from "@/features/purchase-documents/purchases.module.css";
import { UnitCell } from "@/features/purchase-documents/unit-cell";
import { productHref } from "@/features/products/product-helpers";
import { ProductSizeChip } from "@/features/products/product-size";
import type { LotForSale } from "@/features/sales-invoices/contracts";
import { InvoiceLotSelect } from "./invoice-lot-select";
import { countsInKg, fillFromLot, isActive, lineMoney, lotOptions, withQuantity, type EditorLine } from "./invoice-editor-logic";

type Props = {
  lines: readonly EditorLine[]; lots: readonly LotForSale[]; notWholeLots: ReadonlySet<string>; kgPerCage?: number;
  onChange(key: string, next: (line: EditorLine) => EditorLine): void; onRemove(key: string): void; onPickUnit(key: string, unitId: string): void; onWholeLot(lotId: string, checked: boolean): void;
};

/** The unit cell of the receipt editor takes an item with its units: the product of the line and the units it is sold in. */
const unitCellLine = (line: EditorLine) => ({
  item: { id: line.productId, code: line.productCode, name: line.productName, unit: line.unitName, group: "Other" as const, units: line.units.map((unit) => ({ id: unit.id, name: unit.name, factor: unit.factor, code: "", isBase: unit.factor === 1 })) },
  itemUnitId: line.unitId, unitName: line.unitName, unitFactor: line.factor,
});

/**
 * The lines of the invoice, in the table of the receipt editor: what is ordered and already delivered (when the invoice is of an order), the quantity of this delivery in the unit of the line,
 * the harvest lot, the weighed kg (always needed for the stock book), the price per unit (the order's price to start from, free to bargain) and the amount.
 */
export function InvoiceEditorLines({ lines, lots, notWholeLots, onChange, onRemove, onPickUnit, onWholeLot }: Props) {
  const progress = lines.some((line) => line.ordered !== null);
  /** What is left on the lot of the line, in the unit of the line (kg ÷ kg per unit); null without a lot the API lists for sale. */
  // The kg this invoice already holds on each lot when it is opened for a change: the API's remaining kg no longer count them, so they are added back.
  const [savedKg] = useState(() => lines.filter((line) => line.lineId !== null && line.lotId).reduce((sum, line) => sum.set(line.lotId, (sum.get(line.lotId) ?? 0) + (Number(line.kg.replace(",", ".")) || 0)), new Map<string, number>()));
  const lotLeft = (line: EditorLine) => {
    const left = line.lotId ? lots.find((lot) => lot.id === line.lotId)?.remainingKg ?? null : null;
    return left === null ? null : Math.round(((left + (savedKg.get(line.lotId) ?? 0)) / (line.factor || 1)) * 100) / 100;
  };
  /** The quantity typed, never above what is left on the lot. */
  const capped = (value: string, left: number | null) => left !== null && (Number(value.replace(",", ".")) || 0) > left ? String(left) : value;
  return <table className={purchaseStyles.lines}><thead><tr>
    <th className={purchaseStyles.narrow} /><th className={purchaseStyles.narrow}>STT</th><th>Mã hàng</th><th>Tên hàng</th><th>ĐVT</th>
    {progress && <><th className={purchaseStyles.num}>SL đặt</th><th className={purchaseStyles.num}>Đã giao</th></>}
    <th className={purchaseStyles.num}>SL lần này</th><th>Lô thu hoạch</th><th className={purchaseStyles.num}>Kg cân</th><th className={purchaseStyles.num}>Đơn giá</th><th className={purchaseStyles.num}>Thành tiền</th>
  </tr></thead><tbody>{lines.map((line, index) => {
    const position = index + 1, kg = countsInKg(line), outside = line.orderLineId === null && line.lineId === null, left = lotLeft(line);
    const whole = !!line.lotId && !notWholeLots.has(line.lotId);
    return <tr key={line.key}>
      <td className={purchaseStyles.narrow}><button type="button" className={purchaseStyles.remove} aria-label={`Bỏ dòng ${position}`} title="Bỏ dòng" onClick={() => onRemove(line.key)}><InterfaceIcon name="trash" /></button></td>
      <td className={purchaseStyles.narrow}>{position}</td>
      <td>{line.productCode ? <Link className={purchaseStyles.code} href={productHref(line.productCode)} target="_blank">{line.productCode}</Link> : "—"}</td>
      <td>{line.productName}<ProductSizeChip size={line} />{outside && <span className={purchaseStyles.sub}>Thêm ngoài đơn đặt hàng</span>}</td>
      <td><UnitCell line={unitCellLine(line)} index={index} locked={!outside} onPick={(unitId) => onPickUnit(line.key, unitId)} /></td>
      {progress && <><td className={purchaseStyles.num}>{line.ordered === null ? "—" : fmt(line.ordered)}</td><td className={purchaseStyles.num}>{line.delivered === null ? "—" : fmt(line.delivered)}</td></>}
      <td className={purchaseStyles.num}><QuantityStepper label={`số lượng dòng ${position}`} max={left ?? undefined} value={kg ? line.kg : line.quantity} onChange={(value) => onChange(line.key, (current) => withQuantity(current, capped(value, left)))} />
        {left !== null && <span className={purchaseStyles.cap} title="Còn trên lô (ước theo số cân khi thu), quy ra đơn vị của dòng">
          <label><input type="checkbox" aria-label={`Bán hết lô dòng ${position}`} checked={whole} onChange={(event) => {
            onWholeLot(line.lotId, event.target.checked);
            if (event.target.checked) onChange(line.key, (current) => withQuantity(current, String(left)));
          }} /> Bán hết</label> /{fmt(left)}</span>}</td>
      <td><InvoiceLotSelect position={position} options={lotOptions(line, lots)} value={line.lotId} onPick={(lotId, lotCode) => onChange(line.key, (current) => fillFromLot({ ...current, lotId, lotCode }, lots.find((lot) => lot.id === lotId)))} /></td>
      <td className={purchaseStyles.num}>{kg ? <span title="Hàng tính theo kg: số kg cân là số lượng">{line.kg ? fmt(Number(line.kg.replace(",", "."))) : "—"}</span>
        : <input aria-label={`Kg cân dòng ${position}`} inputMode="decimal" className={purchaseStyles.cellInput} value={line.kg} onChange={(event) => onChange(line.key, (current) => ({ ...current, kg: event.target.value.replace(/[^\d.,]/g, "") }))} />}</td>
      <td><MoneyInput label={`Đơn giá dòng ${position}`} className={purchaseStyles.cellInput} value={line.unitPrice} onChange={(unitPrice) => onChange(line.key, (current) => ({ ...current, unitPrice: unitPrice || null }))} />
        {line.referencePrice !== null && line.unitPrice !== line.referencePrice && <span className={purchaseStyles.cap}>giá đã định {fmt(line.referencePrice)}</span>}</td>
      <td className={purchaseStyles.amount}>{isActive(line) ? fmt(lineMoney(line)) : "—"}</td>
    </tr>;
  })}</tbody></table>;
}
