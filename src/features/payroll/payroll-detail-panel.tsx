"use client";
import { useCallback, useId, useState } from "react";
import { ListStateMessage, Subtabs } from "@/components/ui/management-screen/management-table";
import { Skeleton, useRemote } from "@/features/operations/ui";
import { PayrollDetailFooter, type DetailTab } from "./payroll-detail-footer";
import { PayrollSheetInfoTab } from "./payroll-sheet-info-tab";
import { PayrollSheetPaymentsTab } from "./payroll-sheet-payments-tab";
import { PayrollSheetSlipsTab } from "./payroll-sheet-slips-tab";
import { payrollRepository } from "./repository";
import s from "./payroll-screen.module.css";

const tabs = [{ key: "info" as const, label: "Thông tin" }, { key: "slips" as const, label: "Phiếu lương" }, { key: "payments" as const, label: "Lịch sử thanh toán" }];

/** The open row of Bảng lương: tabs "Thông tin", "Phiếu lương" and "Lịch sử thanh toán" (KiotViet), with the actions of the sheet's status in the footer. */
export function PayrollDetailPanel({ id, onChanged }: { id: string; onChanged(notice?: string): void }) {
  const [tab, setTab] = useState<DetailTab>("info"), prefix = useId();
  const remote = useRemote(useCallback((signal: AbortSignal) => payrollRepository.detail(id, signal), [id]));
  const sheet = remote.data;
  const body = remote.loading ? <Skeleton /> : remote.error || !sheet ? <ListStateMessage error={remote.error ?? "Không tải được bảng lương."} onRetry={remote.reload} retryLabel="Tải lại" /> : <>
    <div role="tabpanel" id={`${prefix}-panel-${tab}`} aria-labelledby={`${prefix}-tab-${tab}`} className={s.tabBody}>
      {tab === "info" ? <PayrollSheetInfoTab sheet={sheet} /> : tab === "slips" ? <PayrollSheetSlipsTab slips={sheet.slips} /> : <PayrollSheetPaymentsTab sheetId={sheet.id} paid={sheet.paid} />}
    </div>
    <PayrollDetailFooter sheet={sheet} tab={tab} onChanged={(notice) => { remote.reload(); onChanged(notice); }} />
  </>;
  return <section className={s.detail} aria-label="Chi tiết bảng lương">
    <Subtabs<DetailTab> label="Nội dung bảng lương" tabs={tabs} value={tab} onChange={setTab} idPrefix={prefix} />
    {body}
  </section>;
}
