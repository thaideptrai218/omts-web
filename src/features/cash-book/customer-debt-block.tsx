"use client";
import type { PaymentForm } from "@/features/customers/contracts";
import { AllocationTable } from "@/features/customers/allocation";
import { fmt } from "@/features/purchase-documents/document-parts";
import type { CashDirection } from "./contracts";
import type { VoucherInput } from "./repository";
import styles from "./cash-book.module.css";
import customerStyles from "@/features/customers/customers.module.css";

/** What counting a customer's voucher in the debt can do: a receipt only when the customer owes, a payment only when the cooperative owes the customer. */
export const countableDebt = (direction: CashDirection, form: PaymentForm | undefined) => form ? (direction === "Receipt" ? form.debt : form.owedBack) : 0;

/**
 * "Tính vào công nợ" of a voucher whose party is a customer. Counted, the voucher is a customer payment: a receipt is set against the
 * unpaid invoices ("Phân bổ vào hóa đơn") or only taken off the debt ("Chỉ trừ vào công nợ"); a payment is money paid back.
 */
export function CustomerDebtBlock({ direction, form, values, applied, disabled, onToggle, onMode, onAllocate }: {
  direction: CashDirection; form: PaymentForm; values: Pick<VoucherInput, "countInDebt" | "debtMode">; applied: Record<string, number>; disabled?: boolean;
  onToggle(on: boolean): void; onMode(mode: VoucherInput["debtMode"]): void; onAllocate(invoiceId: string, value: number): void;
}) {
  const receipt = direction === "Receipt", amountDue = countableDebt(direction, form);
  return <div className={`${styles.formWide} ${customerStyles.debtBlock}`}>
    <label className={styles.check}><input type="checkbox" disabled={disabled} checked={values.countInDebt} onChange={(event) => onToggle(event.target.checked)} />Tính vào công nợ</label>
    <p className={styles.hint}>{receipt ? `${form.customer.name} đang nợ ${fmt(amountDue)} đ. Phiếu thu được ghi như một phiếu thanh toán của khách.` : `Hợp tác xã đang nợ ${form.customer.name} ${fmt(amountDue)} đ. Phiếu chi được ghi như tiền trả lại khách.`}</p>
    {values.countInDebt && receipt && <>
      <div className={customerStyles.radioRow} role="radiogroup" aria-label="Cách tính vào công nợ">
        <label><input type="radio" name="debt-mode" checked={values.debtMode === "AllocateToInvoices"} onChange={() => onMode("AllocateToInvoices")} />Phân bổ vào hóa đơn</label>
        <label><input type="radio" name="debt-mode" checked={values.debtMode === "DebtOnly"} onChange={() => onMode("DebtOnly")} />Chỉ trừ vào công nợ</label>
      </div>
      {values.debtMode === "AllocateToInvoices" && <AllocationTable invoices={form.unpaidInvoices} applied={applied} onChange={onAllocate} emptyText="Khách hàng không còn hóa đơn nào chưa thu hết." />}
    </>}
  </div>;
}
