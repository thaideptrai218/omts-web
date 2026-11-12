"use client";
import { useCallback, useMemo } from "react";
import { AccountPicker } from "@/features/cash-book/cash-pickers";
import { listAccounts } from "@/features/cash-book/repository";
import { useRemote } from "@/features/operations/ui";
import { MoneyInput, SideRow } from "@/features/purchase-documents/document-parts";
import purchaseStyles from "@/features/purchase-documents/purchases.module.css";
import type { Advance } from "./order-logic";

const methods: readonly (readonly [Advance["method"], string])[] = [["Cash", "Tiền mặt"], ["OtherTransfer", "Chuyển khoản"], ["VietQr", "VietQR"]];

/** The bank accounts the cooperative receives transfers on; empty when the caller cannot read the cash book (then only cash and a plain transfer are offered). */
export function useReceivingAccounts() {
  const remote = useRemote(useCallback((signal: AbortSignal) => listAccounts("Bank", false, signal), []));
  return useMemo(() => remote.data ?? [], [remote.data]);
}

/**
 * "Khách thanh toán": the advance paid with the order, on a new order and when an open one is opened again (it adds one more advance). Cash needs nothing more,
 * a transfer needs the bank reference (and the account it came into when known), VietQR makes a code that waits for the transfer and needs the receiving account;
 * the code itself comes with the saved payment, so it is shown right after the save.
 */
export function OrderAdvanceFields({ value, total, disabled, onChange }: { value: Advance; total: number; disabled?: boolean; onChange(value: Advance): void }) {
  const accounts = useReceivingAccounts();
  const shown = methods.filter(([key]) => key !== "VietQr" || accounts.length > 0);
  const pick = (next: Advance["method"]) => onChange({ ...value, method: next, cashAccountId: value.cashAccountId || (next === "Cash" ? "" : accounts.find((row) => row.isVietQr)?.id ?? accounts[0]?.id ?? "") });
  return <>
    <SideRow label="Khách thanh toán"><MoneyInput label="Khách thanh toán" disabled={disabled} value={value.amount || null} invalid={value.amount > total} onChange={(amount) => onChange({ ...value, amount })} /></SideRow>
    <div className={purchaseStyles.methods} role="radiogroup" aria-label="Phương thức thanh toán">{shown.map(([key, label]) =>
      <label key={key}><input type="radio" className="sr-only" name="order-advance-method" checked={value.method === key} disabled={disabled} onChange={() => pick(key)} />{label}</label>)}</div>
    {value.method !== "Cash" && accounts.length > 0 && <SideRow label="Tài khoản nhận"><AccountPicker label="Tài khoản nhận" accounts={accounts} value={value.cashAccountId} disabled={disabled} onChange={(cashAccountId) => onChange({ ...value, cashAccountId })} /></SideRow>}
    {value.method === "OtherTransfer" && <SideRow label="Mã giao dịch"><input aria-label="Mã giao dịch ngân hàng" maxLength={100} disabled={disabled} value={value.bankReference} onChange={(event) => onChange({ ...value, bankReference: event.target.value })} /></SideRow>}
    {value.method === "VietQr" && value.amount > 0 && <p className={purchaseStyles.sub}>Mã QR của phiếu thu hiện ngay sau khi lưu; phiếu hoàn tất khi tiền chuyển về.</p>}
  </>;
}
