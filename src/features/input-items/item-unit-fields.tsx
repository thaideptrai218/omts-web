"use client";
import { useState, type KeyboardEvent } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { InterfaceIcon } from "@/components/ui/interface-icon";
import { managementStyles } from "@/components/ui/management-screen/management-table";
import { SelectBox } from "@/components/ui/select-box";
import { ErrorNotice } from "@/features/operations/ui";
import type { InputUnit } from "./contracts";
import { newKey, suggestUnitCode, type UnitDraft } from "./item-helpers";
import styles from "./input-items.module.css";

/** A small dialog that asks for one name (a new unit, a new item group); `onSave` answers the error text, or nothing when it saved. */
export function NameDialog({ title, label, maxLength, onSave, onClose }: { title: string; label: string; maxLength: number; onSave(name: string): Promise<string | undefined>; onClose(): void }) {
  const [name, setName] = useState(""), [pending, setPending] = useState(false), [error, setError] = useState<string>();
  async function submit() {
    if (pending) return;
    if (!name.trim()) { setError(`Nhập ${label.toLocaleLowerCase("vi")}.`); return; }
    setPending(true); setError(undefined);
    const failure = await onSave(name.trim());
    setPending(false);
    if (failure) setError(failure);
  }
  const enter = (event: KeyboardEvent<HTMLInputElement>) => { if (event.key === "Enter") { event.preventDefault(); void submit(); } };
  return <Dialog open size="md" title={title} dismissible={!pending} onOpenChange={(open) => { if (!open) onClose(); }}><div className={managementStyles.theme}>
    <label className="block text-xs font-medium text-text-muted">{label}<input data-dialog-initial-focus className="omts-control mt-1" maxLength={maxLength} value={name} onChange={(event) => setName(event.target.value)} onKeyDown={enter} /></label>
    <ErrorNotice error={error} />
    <div className={styles.formFoot}><Button className="w-auto" variant="secondary" disabled={pending} onClick={onClose}>Bỏ qua</Button><Button className="w-auto" isPending={pending} onClick={() => void submit()}>Lưu</Button></div>
  </div></Dialog>;
}

type Props = {
  units: UnitDraft[]; catalog: readonly InputUnit[]; itemCode: string; baseLocked: boolean; costPrice: string;
  onChange(units: UnitDraft[]): void; onCostChange(value: string): void; onCreate(rowKey: string): void;
};
const parse = (value: string) => { const parsed = Number(value.replace(",", ".")); return value.trim() && Number.isFinite(parsed) ? parsed : null; };
const CREATE = "__create_unit__";

/**
 * Quy cách of one item (KiotViet "Đơn vị tính", without sale prices): the base unit, the other units as "unit = factor × base",
 * then one row per unit with its own code and its cost. Only the base cost is typed; the others are the base cost × factor.
 */
export function UnitFields({ units, catalog, itemCode, baseLocked, costPrice, onChange, onCostChange, onCreate }: Props) {
  const base = units.find((unit) => unit.isBase), nameOf = (row: UnitDraft) => catalog.find((unit) => unit.id === row.unitId)?.name ?? "";
  const baseName = (base && nameOf(base)) || "đơn vị cơ bản", others = units.filter((unit) => !unit.isBase), cost = parse(costPrice);
  const patch = (key: string, change: Partial<UnitDraft>) => onChange(units.map((unit) => unit.key === key ? { ...unit, ...change } : unit));
  const options = (row: UnitDraft) => catalog.filter((unit) => unit.id === row.unitId || !units.some((other) => other.unitId === unit.id));
  // "+ Tạo đơn vị mới" is the last entry of the list itself: picking it opens the name dialog and keeps the current choice.
  const picker = (row: UnitDraft, label: string, locked: boolean) =>
    <SelectBox aria-label={label} className="omts-control" disabled={locked} value={row.unitId} onChange={(event) => { if (event.target.value === CREATE) onCreate(row.key); else patch(row.key, { unitId: event.target.value }); }}>
      <option value="">Chọn đơn vị</option>{options(row).map((unit) => <option key={unit.id} value={unit.id}>{unit.name}</option>)}
      <option value={CREATE}>+ Tạo đơn vị mới</option>
    </SelectBox>;
  // The cost of any unit can be typed; it is stored once, per base unit (typed ÷ factor). While a box has focus it keeps the text typed.
  const [typing, setTyping] = useState<{ key: string; text: string }>();
  const costBox = (row: UnitDraft, factor: number | null, label: string) => {
    const shown = typing?.key === row.key ? typing.text : row.isBase ? costPrice : cost != null && factor ? String(Math.round(cost * factor * 100) / 100) : "";
    return <input aria-label={label} className={`omts-control ${styles.numInput}`} inputMode="decimal" disabled={!row.isBase && !factor} title={!row.isBase && !factor ? "Nhập giá trị quy đổi trước" : undefined} value={shown}
      onBlur={() => setTyping(undefined)}
      onChange={(event) => {
        const text = event.target.value.replace(/[^\d.,]/g, ""), typed = parse(text);
        setTyping({ key: row.key, text });
        if (row.isBase) onCostChange(text);
        else if (factor) onCostChange(typed == null ? "" : String(Math.round(typed / factor * 10000) / 10000));
      }} />;
  };
  return <section className={styles.units} aria-label="Đơn vị tính">
    {base && <div className={styles.unitLine}>
      <label className={styles.unitField}><span>Đơn vị cơ bản</span>{picker(base, "Đơn vị cơ bản", baseLocked)}</label>
      {baseLocked && <span className={styles.hint}>Đã có phát sinh nên không đổi đơn vị cơ bản.</span>}
    </div>}
    {others.map((row, index) => <div key={row.key} className={styles.unitLine}>
      <label className={styles.unitField}><span>Tên đơn vị</span>{picker(row, `Đơn vị ${index + 2}`, row.isUsed)}</label>
      <span className={styles.eq}>=</span>
      <label className={styles.unitField}><span>Giá trị quy đổi</span>
        <span className={styles.factorBox} title={row.isUsed ? "Đơn vị đã dùng trên chứng từ nên không đổi quy đổi" : undefined}>
          <input aria-label={`Quy đổi đơn vị ${index + 2}`} inputMode="decimal" disabled={row.isUsed} value={row.factor} onChange={(event) => patch(row.key, { factor: event.target.value.replace(/[^\d.,]/g, "") })} />
          <em>{baseName}</em>
        </span>
      </label>
      <button type="button" className={styles.iconBtn} aria-label={`Xóa đơn vị ${index + 2}`} title={row.isUsed ? "Đơn vị đã dùng trên chứng từ" : "Xóa đơn vị"} disabled={row.isUsed} onClick={() => onChange(units.filter((unit) => unit.key !== row.key))}><InterfaceIcon name="trash" /></button>
    </div>)}
    <div><button type="button" className={managementStyles.linkButton} onClick={() => onChange([...units, { key: newKey(), id: null, unitId: "", factor: "", code: "", isBase: false, isUsed: false }])}>+ Thêm đơn vị</button></div>
    <table className={styles.unitTable}>
      <thead><tr><th>Đơn vị</th><th className={styles.num}>Quy đổi</th><th>Mã hàng</th><th className={styles.num}>Giá vốn</th></tr></thead>
      <tbody>{[...(base ? [base] : []), ...others].map((row, index) => {
        const factor = row.isBase ? 1 : parse(row.factor);
        return <tr key={row.key}>
          <td>{nameOf(row) || <span className={styles.hint}>Chưa chọn</span>}</td>
          <td className={styles.num}>{factor ?? "—"}</td>
          <td><input aria-label={`Mã ${row.isBase ? "đơn vị cơ bản" : `đơn vị ${index + 1}`}`} className="omts-control" maxLength={30} placeholder={suggestUnitCode(itemCode, nameOf(row)) || "Mã tự động"}
            value={row.code} onChange={(event) => patch(row.key, { code: event.target.value.replace(/\s/g, "") })} /></td>
          <td className={styles.num}>{costBox(row, factor, row.isBase ? "Giá vốn" : `Giá vốn ${nameOf(row) || `đơn vị ${index + 1}`}`)}</td>
        </tr>;
      })}</tbody>
    </table>
    <span className={styles.hint}>Sửa giá vốn ở dòng nào cũng được; các dòng khác tự tính lại theo giá trị quy đổi.</span>
  </section>;
}
