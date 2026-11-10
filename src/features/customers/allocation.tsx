"use client";
import Link from "next/link";
import { useState } from "react";
import { managementStyles } from "@/components/ui/management-screen/management-table";
import { MoneyInput, fmt, viDate } from "@/features/purchase-documents/document-parts";
import purchaseStyles from "@/features/purchase-documents/purchases.module.css";
import type { UnpaidInvoice } from "./contracts";
import { invoiceHref } from "./customer-links";

/** Spreads an amount over the unpaid invoices oldest first, the way a customer usually settles them. */
export function spread(amount: number, invoices: readonly UnpaidInvoice[]): Record<string, number> {
  let left = Math.max(0, amount);
  return Object.fromEntries(invoices.map((invoice) => { const take = Math.max(0, Math.min(left, invoice.unpaid)); left -= take; return [invoice.id, take]; }));
}

/**
 * The money set against each unpaid invoice, in step with the amount the form shows. Typing an amount spreads it oldest first; typing into
 * an invoice row sets that row, and "Số tiền" follows the rows while the two agree and grows to cover them otherwise.
 */
export function useAllocation(invoices: readonly UnpaidInvoice[], paying: number, discount: number, setAmount: (amount: number) => void) {
  const [applied, setApplied] = useState<Record<string, number>>({});
  const sum = (map: Record<string, number>) => invoices.reduce((total, invoice) => total + (map[invoice.id] ?? 0), 0);
  const allocated = sum(applied);
  return {
    applied, allocated,
    respread: (nextPaying: number) => setApplied(spread(nextPaying, invoices)),
    change: (invoiceId: string, value: number) => {
      const next = { ...applied, [invoiceId]: value }, total = sum(next);
      setApplied(next);
      if (allocated === paying || total > paying) setAmount(Math.max(0, total - discount));
    },
    named: () => invoices.filter((invoice) => (applied[invoice.id] ?? 0) > 0).map((invoice) => ({ invoiceId: invoice.id, amount: applied[invoice.id] })),
    over: () => invoices.find((invoice) => (applied[invoice.id] ?? 0) > invoice.unpaid),
  };
}

/** "Phân bổ vào hóa đơn": what each unpaid invoice still needs, and how much of this payment goes to it. */
export function AllocationTable({ invoices, applied, onChange, moneyLabel = "Tiền thu", emptyText }: {
  invoices: readonly UnpaidInvoice[]; applied: Record<string, number>; onChange(invoiceId: string, value: number): void; moneyLabel?: string; emptyText: string;
}) {
  const left = (invoice: UnpaidInvoice) => invoice.unpaid - (applied[invoice.id] ?? 0);
  return <div className={purchaseStyles.innerScroll}><table className={purchaseStyles.inner}><thead><tr>
    <th>Mã hóa đơn</th><th>Thời gian</th><th className={purchaseStyles.num}>Giá trị</th><th className={purchaseStyles.num}>Đã thu trước</th><th className={purchaseStyles.num}>Còn cần thu</th><th className={purchaseStyles.num}>{moneyLabel}</th><th className={purchaseStyles.num}>Còn nợ</th></tr></thead>
    <tbody>
      <tr className={purchaseStyles.totalRow}><td colSpan={4} /><td className={purchaseStyles.num}>{fmt(invoices.reduce((total, invoice) => total + invoice.unpaid, 0))}</td>
        <td className={purchaseStyles.num}>{fmt(invoices.reduce((total, invoice) => total + (applied[invoice.id] ?? 0), 0))}</td><td className={purchaseStyles.num}>{fmt(invoices.reduce((total, invoice) => total + left(invoice), 0))}</td></tr>
      {invoices.map((invoice) => <tr key={invoice.id}>
        <td><Link className={managementStyles.linkButton} href={invoiceHref(invoice.code)}>{invoice.code}</Link></td><td>{viDate(invoice.invoiceDate)}</td>
        <td className={purchaseStyles.num}>{fmt(invoice.total)}</td><td className={purchaseStyles.num}>{fmt(invoice.covered)}</td><td className={purchaseStyles.num}>{fmt(invoice.unpaid)}</td>
        <td className={purchaseStyles.num}><MoneyInput label={`${moneyLabel} hóa đơn ${invoice.code}`} className={purchaseStyles.cellInput} invalid={(applied[invoice.id] ?? 0) > invoice.unpaid} value={applied[invoice.id] ?? 0} onChange={(value) => onChange(invoice.id, value)} /></td>
        <td className={purchaseStyles.num}>{fmt(left(invoice))}</td></tr>)}
      {!invoices.length && <tr><td colSpan={7} className={purchaseStyles.empty}>{emptyText}</td></tr>}
    </tbody></table></div>;
}
