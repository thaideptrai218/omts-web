"use client";
import Link from "next/link";
import { InterfaceIcon } from "@/components/ui/interface-icon";
import { SelectBox } from "@/components/ui/select-box";
import inputStyles from "@/features/input-items/input-items.module.css";
import { MoneyInput, QuantityStepper, fmt } from "@/features/purchase-documents/document-parts";
import purchaseStyles from "@/features/purchase-documents/purchases.module.css";
import { productHref } from "@/features/products/product-helpers";
import { lineAmount, parseQuantity } from "./order-logic";

export type LineUnit = { id: string; name: string; factor: number; salePrice: number | null };
/** One line of the form: a product counted in one of its units, with the quantity typed and the price per that unit. */
export type EditorLine = {
  key: string; productId: string; productCode: string; productName: string; units: LineUnit[]; unitId: string;
  quantity: string; unitPrice: number | null; listPrice: number | null; note: string;
  /** What was already delivered on the line (in its unit): the line stays, in its unit, and its quantity does not go below it. */
  delivered: number;
};

/** The lines of the order form: quantity and price per the unit of the line; a small link under the name switches the unit. */
export function OrderLinesTable({ lines, onChange, onRemove }: { lines: readonly EditorLine[]; onChange(key: string, patch: Partial<EditorLine>): void; onRemove(key: string): void }) {
  return <table className={purchaseStyles.lines}><thead><tr>
    <th className={purchaseStyles.narrow} /><th className={purchaseStyles.narrow}>STT</th><th>Mã hàng</th><th>Tên hàng</th>
    <th className={purchaseStyles.num}>Số lượng</th><th className={purchaseStyles.num}>Đơn giá</th><th className={purchaseStyles.num}>Thành tiền</th>
  </tr></thead><tbody>{lines.map((line, index) => {
    const position = index + 1, unit = line.units.find((row) => row.id === line.unitId);
    return <tr key={line.key}>
      <td className={purchaseStyles.narrow}><button type="button" className={purchaseStyles.remove} aria-label={`Bỏ dòng ${position}`} title="Bỏ dòng" disabled={line.delivered > 0} onClick={() => onRemove(line.key)}><InterfaceIcon name="trash" /></button></td>
      <td className={purchaseStyles.narrow}>{position}</td>
      <td><Link className={purchaseStyles.code} href={productHref(line.productCode)} target="_blank">{line.productCode}</Link></td>
      <td>{line.productName}
        {line.units.length > 1 && line.delivered === 0
          ? <span className={inputStyles.unitPick}><SelectBox aria-label={`Đơn vị tính dòng ${position}`} className={inputStyles.unitLink} value={line.unitId} onChange={(event) => {
            const next = line.units.find((row) => row.id === event.target.value);
            if (next) onChange(line.key, { unitId: next.id, unitPrice: next.salePrice, listPrice: next.salePrice });
          }}>{line.units.map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}</SelectBox></span>
          : <span className={purchaseStyles.sub}>- {unit?.name ?? ""}</span>}
        <input className={purchaseStyles.lotInput} aria-label={`Ghi chú dòng ${position}`} placeholder="Ghi chú..." maxLength={500} value={line.note} onChange={(event) => onChange(line.key, { note: event.target.value })} /></td>
      <td className={purchaseStyles.num}><QuantityStepper label={`số lượng dòng ${position}`} value={line.quantity} invalid={(parseQuantity(line.quantity) ?? 0) < line.delivered} onChange={(quantity) => onChange(line.key, { quantity })} />{line.delivered > 0 && <span className={purchaseStyles.cap}>đã giao {fmt(line.delivered)}</span>}</td>
      <td><MoneyInput label={`Đơn giá dòng ${position}`} className={purchaseStyles.cellInput} value={line.unitPrice} onChange={(unitPrice) => onChange(line.key, { unitPrice })} />
        {line.listPrice != null && line.unitPrice !== line.listPrice && <span className={purchaseStyles.cap}>niêm yết {fmt(line.listPrice)}</span>}</td>
      <td className={purchaseStyles.amount}>{fmt(lineAmount(parseQuantity(line.quantity), line.unitPrice))}</td>
    </tr>;
  })}</tbody></table>;
}
