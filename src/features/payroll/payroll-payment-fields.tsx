"use client";
import { useEffect } from "react";
import { SelectBox } from "@/components/ui/select-box";
import { DatePickerField } from "@/components/ui/management-screen/date-picker-field";
import { businessTime, toApiTime } from "@/features/operations/ui";
import type { PaymentMethod } from "./contracts";
import { useBankAccounts } from "./use-bank-accounts";
import { methodLabel } from "./payroll-model";
import s from "./payroll-screen.module.css";

export type PaymentHeader = { paidAt: string; method: PaymentMethod; note: string; cashAccountId: string };
export const newPaymentHeader = (): PaymentHeader => ({ paidAt: businessTime(), method: "Cash", note: "", cashAccountId: "" });
/** The account to send with the payment: only a bank transfer names one (the backend refuses an account with cash). */
export const accountField = (header: PaymentHeader) => header.method === "BankTransfer" && header.cashAccountId ? { cashAccountId: header.cashAccountId } : {};
/** ISO-8601 instant of the picked local (Vietnam) time. */
export const paidAtInstant = (value: string) => new Date(toApiTime(value) ?? "").toISOString();
/** Digits only, no leading zeros: the text of a money box. */
export const digits = (text: string) => text.replace(/\D/g, "").replace(/^0+(?=\d)/, "").slice(0, 12);

/** "Thời gian", "Phương thức thanh toán", the bank account (transfer only) and "Ghi chú", shared by both payment pop-ups. */
export function PaymentHeaderFields({ value, onChange }: { value: PaymentHeader; onChange(next: PaymentHeader): void }) {
  const accounts = useBankAccounts(value.method === "BankTransfer");
  // The first account is chosen at once, so a transfer is recorded against a fund by default; the Owner can change it or clear it.
  const first = accounts[0]?.id;
  useEffect(() => { if (value.method === "BankTransfer" && !value.cashAccountId && first) onChange({ ...value, cashAccountId: first }); }, [value, first, onChange]);
  return <>
    <span className={s.label}>Thời gian</span>
    <div><DatePickerField label="Thời gian" withTime value={value.paidAt} onChange={(paidAt) => onChange({ ...value, paidAt })} /></div>
    <label htmlFor="payroll-method">Phương thức thanh toán</label>
    <SelectBox id="payroll-method" value={value.method} onChange={(event) => onChange({ ...value, method: event.target.value as PaymentMethod, cashAccountId: "" })}>
      {(Object.keys(methodLabel) as PaymentMethod[]).map((key) => <option key={key} value={key}>{methodLabel[key]}</option>)}
    </SelectBox>
    {value.method === "BankTransfer" && <>
      <label htmlFor="payroll-account">Tài khoản chi</label>
      <SelectBox id="payroll-account" value={value.cashAccountId} onChange={(event) => onChange({ ...value, cashAccountId: event.target.value })}>
        <option value="">{accounts.length ? "Không chọn tài khoản" : "Chưa có tài khoản ngân hàng trong Sổ quỹ"}</option>
        {accounts.map((account) => <option key={account.id} value={account.id}>{account.providerName} - {account.accountNumber}{account.holderName ? ` (${account.holderName})` : ""}</option>)}
      </SelectBox></>}
    <label htmlFor="payroll-note">Ghi chú</label>
    <textarea id="payroll-note" maxLength={500} value={value.note} onChange={(event) => onChange({ ...value, note: event.target.value })} />
  </>;
}
