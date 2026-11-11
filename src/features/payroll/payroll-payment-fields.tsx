"use client";
import { DatePickerField } from "@/components/ui/management-screen/date-picker-field";
import { businessTime, toApiTime } from "@/features/operations/ui";
import type { PaymentMethod } from "./contracts";
import { methodLabel } from "./payroll-model";
import s from "./payroll-screen.module.css";

export type PaymentHeader = { paidAt: string; method: PaymentMethod; note: string };
export const newPaymentHeader = (): PaymentHeader => ({ paidAt: businessTime(), method: "Cash", note: "" });
/** ISO-8601 instant of the picked local (Vietnam) time. */
export const paidAtInstant = (value: string) => new Date(toApiTime(value) ?? "").toISOString();
/** Digits only, no leading zeros: the text of a money box. */
export const digits = (text: string) => text.replace(/\D/g, "").replace(/^0+(?=\d)/, "").slice(0, 12);

/** "Thời gian", "Phương thức thanh toán" and "Ghi chú", shared by both payment pop-ups. */
export function PaymentHeaderFields({ value, onChange }: { value: PaymentHeader; onChange(next: PaymentHeader): void }) {
  return <>
    <span className={s.label}>Thời gian</span>
    <div><DatePickerField label="Thời gian" withTime value={value.paidAt} onChange={(paidAt) => onChange({ ...value, paidAt })} /></div>
    <label htmlFor="payroll-method">Phương thức thanh toán</label>
    <select id="payroll-method" value={value.method} onChange={(event) => onChange({ ...value, method: event.target.value as PaymentMethod })}>
      {(Object.keys(methodLabel) as PaymentMethod[]).map((key) => <option key={key} value={key}>{methodLabel[key]}</option>)}
    </select>
    <label htmlFor="payroll-note">Ghi chú</label>
    <textarea id="payroll-note" maxLength={500} value={value.note} onChange={(event) => onChange({ ...value, note: event.target.value })} />
  </>;
}
