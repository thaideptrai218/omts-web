"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { managementStyles } from "@/components/ui/management-screen/management-table";
import { SelectBox } from "@/components/ui/select-box";
import cashStyles from "@/features/cash-book/cash-book.module.css";
import { percentText, type VatRateRow } from "@/features/input-items/vat-rate";
import { ErrorNotice, Field } from "@/features/operations/ui";
import { vatRateError, vatRateRepository } from "./repository";
import styles from "./vat-rate-settings.module.css";

/** The percent a person types ("8", "8,5", "7.25") as a number with at most two decimals from 0 to 100; null when it is none of that. */
export function parsePercent(value: string): number | null {
  const text = value.trim().replace(",", ".");
  if (!/^\d{1,3}(\.\d{1,2})?$/.test(text)) return null;
  const parsed = Number(text);
  return parsed >= 0 && parsed <= 100 ? parsed : null;
}

/** Thêm mức thuế (no `rate`) or sửa mức thuế: a name and a percent. Changing the percent of a rate asks once more, since it only applies to documents made afterwards. */
export function RateDialog({ rate, onClose, onSaved }: { rate?: VatRateRow; onClose(): void; onSaved(saved: VatRateRow, changedPercent: boolean): void }) {
  const [name, setName] = useState(rate?.name ?? ""), [percent, setPercent] = useState(rate?.percent == null ? "" : String(rate.percent).replace(".", ","));
  const [pending, setPending] = useState(false), [confirming, setConfirming] = useState(false), [error, setError] = useState<string>();
  async function save() {
    const value = parsePercent(percent), trimmed = name.trim();
    if (!trimmed) { setError("Nhập tên mức thuế."); return; }
    if (trimmed.length > 50) { setError("Tên mức thuế tối đa 50 ký tự."); return; }
    if (value === null) { setError("Thuế suất là số từ 0 đến 100, tối đa 2 chữ số thập phân."); return; }
    const changedPercent = !!rate && value !== rate.percent;
    if (changedPercent && !confirming) { setError(undefined); setConfirming(true); return; }
    setPending(true); setError(undefined);
    const result = rate ? await vatRateRepository.update(rate.id, { name: trimmed, percent: value, rowVersion: rate.rowVersion }) : await vatRateRepository.create({ name: trimmed, percent: value });
    setPending(false);
    if (result.status === "success") onSaved(result.data, changedPercent); else { setConfirming(false); setError(vatRateError(result)); }
  }
  return <Dialog open size="md" dismissible={!pending} title={rate ? `Sửa mức thuế ${rate.name}` : "Thêm mức thuế"} onOpenChange={(open) => { if (!open) onClose(); }}><div className={managementStyles.theme}>
    <form onSubmit={(event) => { event.preventDefault(); if (!pending) void save(); }}>
      <div className={styles.form}>
        <Field label="Tên *" autoFocus maxLength={50} value={name} onChange={(event) => { setName(event.target.value); setConfirming(false); }} />
        <Field label="Thuế suất (%) *" inputMode="decimal" maxLength={6} placeholder="Ví dụ: 8" value={percent} onChange={(event) => { setPercent(event.target.value.replace(/[^\d.,]/g, "")); setConfirming(false); }} />
      </div>
      {rate && <p className={styles.note}>Đổi % chỉ áp dụng cho phiếu tạo sau; phiếu đã lập giữ mức cũ.</p>}
      {confirming && rate && <p role="status" className={styles.confirm}>Đổi thuế suất của {rate.name} từ {percentText(rate.percent)} sang {percentText(parsePercent(percent))}? Bấm Xác nhận để lưu.</p>}
      <ErrorNotice error={error} />
      <footer className={cashStyles.foot}><div /><div><Button className="w-auto" variant="secondary" disabled={pending} onClick={onClose}>Bỏ qua</Button><Button className="w-auto" type="submit" isPending={pending}>{confirming ? "Xác nhận" : "Lưu"}</Button></div></footer>
    </form>
  </div></Dialog>;
}

/** Ngừng dùng a rate that items still use: those items must move to another active rate, which the user picks. */
export function DeactivateDialog({ rate, others, onClose, onDone }: { rate: VatRateRow; others: readonly VatRateRow[]; onClose(): void; onDone(result: { rate: VatRateRow; movedItems: number; replacement: VatRateRow }): void }) {
  const [replacementId, setReplacementId] = useState(""), [pending, setPending] = useState(false), [error, setError] = useState<string>();
  async function submit() {
    const replacement = others.find((other) => other.id === replacementId);
    if (!replacement) { setError("Chọn mức thuế mới cho các mặt hàng."); return; }
    setPending(true); setError(undefined);
    const result = await vatRateRepository.deactivate(rate.id, { replacementId, rowVersion: rate.rowVersion });
    setPending(false);
    if (result.status === "success") onDone({ ...result.data, replacement }); else setError(vatRateError(result));
  }
  return <Dialog open size="md" dismissible={!pending} title={`Ngừng dùng mức thuế ${rate.name}`} onOpenChange={(open) => { if (!open) onClose(); }}><div className={managementStyles.theme}>
    <form onSubmit={(event) => { event.preventDefault(); if (!pending) void submit(); }}>
      <label className="block text-xs font-medium text-text-muted">Chuyển {rate.itemCount} mặt hàng sang mức:
        <SelectBox aria-label="Mức thuế mới" className="omts-control mt-1" value={replacementId} onChange={(event) => setReplacementId(event.target.value)}>
          <option value="" disabled>Chọn mức thuế</option>{others.map((other) => <option key={other.id} value={other.id}>{other.name}</option>)}</SelectBox></label>
      <p className={styles.note}>Phiếu nhập đã lập giữ mức cũ của từng dòng.</p>
      <ErrorNotice error={error} />
      <footer className={cashStyles.foot}><div /><div><Button className="w-auto" variant="secondary" disabled={pending} onClick={onClose}>Bỏ qua</Button><Button className="w-auto" type="submit" isPending={pending}>Ngừng dùng</Button></div></footer>
    </form>
  </div></Dialog>;
}
