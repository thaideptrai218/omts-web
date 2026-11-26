"use client";
import Link from "next/link";
import { InterfaceIcon } from "@/components/ui/interface-icon";
import { MoneyInput, QuantityStepper, fmt } from "@/features/purchase-documents/document-parts";
import purchaseStyles from "@/features/purchase-documents/purchases.module.css";
import { ApproxKg } from "@/components/ui/approx-kg";
import { kgPerCageOfUnit } from "@/shared/format/approx-kg";
import { productHref } from "@/features/products/product-helpers";
import { ProductSizeChip } from "@/features/products/product-size";
import styles from "./order-lines.module.css";
import { lineAmount, parseQuantity } from "./order-logic";

export type LineUnit = { id: string; name: string; factor: number; salePrice: number | null };
/** One line of the form: a product counted in one of its units, with the quantity typed and the price per that unit. */
export type EditorLine = {
  key: string; productId: string; productCode: string; productName: string; units: LineUnit[]; unitId: string;
  quantity: string; unitPrice: number | null; listPrice: number | null; note: string;
  /** What tells the buyer which oyster this is: the group and the description of the product. */
  group?: string;
  /** Average size at maturity in cm (a reference, not a promise). */
  sizeMinCm?: number | null; sizeMaxCm?: number | null;
  /** What was already delivered on the line (in its unit): the line stays, in its unit, and its quantity does not go below it. */
  delivered: number;
};

const unitLabel = (unit: LineUnit) => unit.factor === 1 ? "kg" : `${unit.name} (${unit.factor.toLocaleString("vi-VN")} kg)`;

/** The lines of the order form: quantity and price per the unit of the line; a small link under the name switches the unit. */
export function OrderLinesTable({ lines, onChange, onRemove }: { lines: readonly EditorLine[]; onChange(key: string, patch: Partial<EditorLine>): void; onRemove(key: string): void }) {
  return <table className={purchaseStyles.lines}><thead><tr>
    <th className={purchaseStyles.narrow} /><th className={purchaseStyles.narrow}>STT</th><th>Mã hàng</th><th>Hàng đặt</th>
    <th className={purchaseStyles.num}>Số lượng và đơn vị</th><th className={purchaseStyles.num}>Đơn giá</th><th className={purchaseStyles.num}>Thành tiền</th>
  </tr></thead><tbody>{lines.map((line, index) => {
    const position = index + 1, unit = line.units.find((row) => row.id === line.unitId), kgOf = (parseQuantity(line.quantity) ?? 0) * (unit?.factor ?? 1);
    return <tr key={line.key}>
      <td className={purchaseStyles.narrow}><button type="button" className={purchaseStyles.remove} aria-label={`Bỏ dòng ${position}`} title="Bỏ dòng" disabled={line.delivered > 0} onClick={() => onRemove(line.key)}><InterfaceIcon name="trash" /></button></td>
      <td className={purchaseStyles.narrow}>{position}</td>
      <td><Link className={purchaseStyles.code} href={productHref(line.productCode)} target="_blank">{line.productCode}</Link></td>
      <td><div className={styles.product}>
        <span className={styles.name}>{line.productName}</span>
        {(line.group || line.sizeMinCm != null) && <span className={styles.chips}>{line.group && <span className={styles.chip}>{line.group}</span>}<ProductSizeChip size={line} /></span>}
        <input className={styles.note} aria-label={`Ghi chú dòng ${position}`} placeholder="Ghi chú..." maxLength={500} value={line.note} onChange={(event) => onChange(line.key, { note: event.target.value })} />
      </div></td>
      <td className={purchaseStyles.num}><div className={styles.quantity}>
        <div className={styles.entry}>
          <QuantityStepper label={`số lượng dòng ${position}`} value={line.quantity} invalid={(parseQuantity(line.quantity) ?? 0) < line.delivered} onChange={(quantity) => onChange(line.key, { quantity })} />
          <select className={styles.unit} aria-label={`Đơn vị tính dòng ${position}`} value={line.unitId} disabled={line.units.length < 2 || line.delivered > 0} onChange={(event) => {
            const next = line.units.find((row) => row.id === event.target.value);
            if (next) onChange(line.key, { unitId: next.id, unitPrice: next.salePrice, listPrice: next.salePrice });
          }}>{line.units.map((row) => <option key={row.id} value={row.id}>{unitLabel(row)}</option>)}</select>
        </div>
        {unit && unit.factor !== 1 && (kgPerCageOfUnit(unit) ? <span className={styles.convert}><ApproxKg cages={parseQuantity(line.quantity)} kgPerCage={unit.factor} /> (ước tính)</span> : <span className={styles.convert}>= {fmt(kgOf)} kg</span>)}
        {line.delivered > 0 && <span className={purchaseStyles.cap}>đã giao {fmt(line.delivered)}</span>}
      </div></td>
      <td><MoneyInput label={`Đơn giá dòng ${position}`} className={purchaseStyles.cellInput} value={line.unitPrice} onChange={(unitPrice) => onChange(line.key, { unitPrice })} />
        {line.listPrice != null && line.unitPrice !== line.listPrice && <span className={purchaseStyles.cap}>niêm yết {fmt(line.listPrice)}</span>}</td>
      <td className={purchaseStyles.amount}>{fmt(lineAmount(parseQuantity(line.quantity), line.unitPrice))}</td>
    </tr>;
  })}</tbody></table>;
}
