"use client";
import { FilterGroup } from "@/components/ui/management-screen/management-layout";
import { managementStyles } from "@/components/ui/management-screen/management-table";
import { payrollStatuses, type PayrollStatus, type PeriodType } from "./contracts";
import { periodLabel, statusLabel } from "./payroll-model";
import s from "./payroll-screen.module.css";

/** Left filter column of Bảng lương: pay period kind (select) and status (checkboxes, "Đã hủy" off by default). */
export function PayrollFilterRail({ periodType, statuses, hasFilter, onPeriodType, onStatuses, onReset }: {
  periodType: "" | PeriodType; statuses: readonly PayrollStatus[]; hasFilter: boolean; onPeriodType(value: "" | PeriodType): void; onStatuses(value: readonly PayrollStatus[]): void; onReset(): void;
}) {
  return <>
    <div className={s.railHead}><strong>Bộ lọc</strong><button type="button" className={managementStyles.linkButton} disabled={!hasFilter} onClick={onReset}>Đặt lại</button></div>
    <FilterGroup legend="Kỳ hạn trả lương">
      <select className={s.railSelect} aria-label="Kỳ hạn trả lương" value={periodType} onChange={(event) => onPeriodType(event.target.value as "" | PeriodType)}>
        <option value="">Tất cả</option>
        {(Object.keys(periodLabel) as PeriodType[]).map((key) => <option key={key} value={key}>{periodLabel[key]}</option>)}
      </select>
    </FilterGroup>
    <FilterGroup legend="Trạng thái">
      <div className={s.checkList}>{payrollStatuses.map((status) =>
        <label key={status}><input type="checkbox" checked={statuses.includes(status)}
          onChange={(event) => onStatuses(payrollStatuses.filter((item) => item === status ? event.target.checked : statuses.includes(item)))} />{statusLabel[status]}</label>)}</div>
    </FilterGroup>
  </>;
}
