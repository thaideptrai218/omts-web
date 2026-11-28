import { StatusPill } from "@/components/ui/management-page";
import type { PayrollStatus } from "./contracts";
import { paymentStateLabel, paymentStateOf, paymentStateTone, statusLabel, statusTone, type SlipPaymentState } from "./payroll-model";

/**
 * The two statuses of a payslip, kept apart: the status of its sheet (Tạm tính / Đã chốt lương / Đã hủy) and, once the sheet is finalized,
 * how much of the net pay was handed over (Chưa trả / Trả một phần / Đã trả). `state` overrides the state worked out from net and paid.
 */
export function SlipStatusPills({ status, net, paid, state }: { status: PayrollStatus; net: number; paid: number; state?: SlipPaymentState }) {
  const payment = status === "Finalized" ? state ?? paymentStateOf(net, paid) : undefined;
  return <span className="inline-flex flex-wrap items-center gap-1">
    <StatusPill tone={statusTone(status)}>{statusLabel[status]}</StatusPill>
    {payment && <StatusPill tone={paymentStateTone[payment]}>{paymentStateLabel[payment]}</StatusPill>}
  </span>;
}
