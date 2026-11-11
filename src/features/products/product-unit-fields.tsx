"use client";
import { InterfaceIcon } from "@/components/ui/interface-icon";
import { managementStyles } from "@/components/ui/management-screen/management-table";
import { SelectBox } from "@/components/ui/select-box";
import type { InputUnit } from "@/features/input-items/contracts";
import styles from "@/features/input-items/input-items.module.css";
import { foldVietnamese } from "@/shared/presentation/fold-text";
import { MoneyInput } from "@/features/purchase-documents/document-parts";
import { blankUnit, defaultUnitPrice, parseNumber, suggestUnitCode, type UnitDraft } from "./product-helpers";

type Props = { units: UnitDraft[]; catalog: readonly InputUnit[]; productCode: string; unitPrice: number; onPriceChange(price: number): void; onChange(units: UnitDraft[]): void; onCreate(rowKey: string): void };
const CREATE = "__create_unit__";
const isKg = (name: string) => foldVietnamese(name).trim().toLowerCase() === "kg";

/**
 * Đơn vị tính of one product: kg is the base unit and cannot be changed (prices, stock and invoices are per kg); every other unit is a
 * row "unit = factor kg" with its own code. The unit list is the one shared with Vật tư; "+ Tạo đơn vị mới" is the last entry of the list.
 */
export function ProductUnitFields({ units, catalog, productCode, unitPrice, onPriceChange, onChange, onCreate }: Props) {
  const nameOf = (row: UnitDraft) => catalog.find((unit) => unit.id === row.unitId)?.name ?? "";
  const patch = (key: string, change: Partial<UnitDraft>) => onChange(units.map((unit) => unit.key === key ? { ...unit, ...change } : unit));
  const options = (row: UnitDraft) => catalog.filter((unit) => unit.id === row.unitId || !isKg(unit.name) && !units.some((other) => other.unitId === unit.id));
  return <section className={styles.units} aria-label="Đơn vị tính">
    <div className={styles.unitLine}>
      <label className={styles.unitField}><span>Đơn vị gốc</span><input aria-label="Đơn vị gốc" className="omts-control" value="kg" readOnly /></label>
      <span className={styles.hint}>Giá bán, còn lại và hóa đơn đều tính theo kg.</span>
    </div>
    {units.map((row, index) => <div key={row.key} className={styles.unitLine}>
      <label className={styles.unitField}><span>Tên đơn vị</span>
        <SelectBox aria-label={`Đơn vị ${index + 2}`} className="omts-control" value={row.unitId} onChange={(event) => { if (event.target.value === CREATE) onCreate(row.key); else patch(row.key, { unitId: event.target.value }); }}>
          <option value="">Chọn đơn vị</option>{options(row).map((unit) => <option key={unit.id} value={unit.id}>{unit.name}</option>)}
          <option value={CREATE}>+ Tạo đơn vị mới</option>
        </SelectBox></label>
      <span className={styles.eq}>=</span>
      <label className={styles.unitField}><span>Giá trị quy đổi</span>
        <span className={styles.factorBox}>
          <input aria-label={`Quy đổi đơn vị ${index + 2}`} inputMode="decimal" value={row.factor} onChange={(event) => patch(row.key, { factor: event.target.value.replace(/[^\d.,]/g, "") })} />
          <em>kg</em>
        </span>
      </label>
      <button type="button" className={styles.iconBtn} aria-label={`Xóa đơn vị ${index + 2}`} title="Xóa đơn vị" onClick={() => onChange(units.filter((unit) => unit.key !== row.key))}><InterfaceIcon name="trash" /></button>
    </div>)}
    <div><button type="button" className={managementStyles.linkButton} onClick={() => onChange([...units, blankUnit()])}>+ Thêm đơn vị</button></div>
    <table className={styles.unitTable} aria-label="Hàng cùng loại">
      <thead><tr><th>Đơn vị</th><th className={styles.num}>Quy đổi (kg)</th><th>Mã hàng</th><th className={styles.num}>Giá bán</th></tr></thead>
      <tbody>
        <tr>
          <td>kg</td><td className={styles.num}>1</td>
          <td><input aria-label="Mã đơn vị gốc" className="omts-control" readOnly value={productCode ? `${productCode}-K` : ""} placeholder="Mã tự động" /></td>
          <td className={styles.num}><MoneyInput label="Giá bán theo kg" className={`omts-control ${styles.numInput}`} value={unitPrice || null} onChange={onPriceChange} /></td>
        </tr>
        {units.map((row, index) => {
          const factor = parseNumber(row.factor), auto = defaultUnitPrice(factor, unitPrice);
          return <tr key={row.key}>
            <td>{nameOf(row) || <span className={styles.hint}>Chưa chọn</span>}</td>
            <td className={styles.num}>{factor ?? "—"}</td>
            <td><input aria-label={`Mã đơn vị ${index + 2}`} className="omts-control" maxLength={30} placeholder={suggestUnitCode(productCode, nameOf(row)) || "Mã tự động"} value={row.code} onChange={(event) => patch(row.key, { code: event.target.value.replace(/\s/g, "") })} /></td>
            <td className={styles.num}><MoneyInput label={`Giá bán đơn vị ${index + 2}`} className={`omts-control ${styles.numInput}`} value={row.salePrice ?? auto} onChange={(salePrice) => patch(row.key, { salePrice: salePrice || null })} /></td>
          </tr>;
        })}
      </tbody>
    </table>
    <span className={styles.hint}>Đơn vị mới được điền sẵn giá = quy đổi × giá bán theo kg; sửa được riêng từng đơn vị. Giá bán theo kg là giá trên hóa đơn.</span>
  </section>;
}
