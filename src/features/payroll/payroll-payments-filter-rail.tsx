"use client";
import { SelectBox } from "@/components/ui/select-box";
import { FilterGroup } from "@/components/ui/management-screen/management-layout";
import { managementStyles } from "@/components/ui/management-screen/management-table";
import { TimeRangeFilter } from "@/components/ui/management-screen/time-range-filter";
import type { TimeRangeValue } from "@/components/ui/management-screen/time-range-model";
import type { PaymentKind, PaymentMethod, PaymentStatus } from "./contracts";
import { kindLabel, methodLabel, paymentStatusLabel } from "./payroll-model";
import s from "./payroll-screen.module.css";

export type PaymentFilters = Readonly<{ method: "" | PaymentMethod; kind: "" | PaymentKind; status: "" | PaymentStatus }>;
export const noPaymentFilters: PaymentFilters = { method: "", kind: "", status: "" };

function Pick<T extends string>({ legend, value, labels, onChange }: { legend: string; value: "" | T; labels: Readonly<Record<T, string>>; onChange(value: "" | T): void }) {
  return <FilterGroup legend={legend}>
    <SelectBox className={s.railSelect} aria-label={legend} value={value} onChange={(event) => onChange(event.target.value as "" | T)}>
      <option value="">Tất cả</option>
      {(Object.keys(labels) as T[]).map((key) => <option key={key} value={key}>{labels[key]}</option>)}
    </SelectBox>
  </FilterGroup>;
}

/** Left filter column of "Thanh toán lương": time range, payment method, kind (wage or advance) and voucher status, all applied by the server. */
export function PayrollPaymentsFilterRail({ time, filters, hasFilter, onTime, onFilters, onReset }: {
  time: TimeRangeValue; filters: PaymentFilters; hasFilter: boolean; onTime(value: TimeRangeValue): void; onFilters(value: PaymentFilters): void; onReset(): void;
}) {
  return <>
    <div className={s.railHead}><strong>Bộ lọc</strong><button type="button" className={managementStyles.linkButton} disabled={!hasFilter} onClick={onReset}>Đặt lại</button></div>
    <TimeRangeFilter legend="Thời gian" value={time} onChange={onTime} />
    <Pick legend="Loại" value={filters.kind} labels={kindLabel} onChange={(kind) => onFilters({ ...filters, kind })} />
    <Pick legend="Phương thức" value={filters.method} labels={methodLabel} onChange={(method) => onFilters({ ...filters, method })} />
    <Pick legend="Trạng thái" value={filters.status} labels={paymentStatusLabel} onChange={(status) => onFilters({ ...filters, status })} />
  </>;
}
