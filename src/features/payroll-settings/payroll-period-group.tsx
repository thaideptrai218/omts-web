"use client";
import { useCallback } from "react";
import { Button } from "@/components/ui/button";
import { ErrorNotice, Skeleton, useRemote } from "@/features/operations/ui";
import { PayrollPeriodFormCard } from "./payroll-period-form-card";
import { PayrollPreviewPanel } from "./payroll-preview-panel";
import type { PayrollSettings } from "./contracts";
import { readPayrollSettings, usePayrollSettingsEditor } from "./use-payroll-settings-editor";
import s from "./payroll-settings-screen.module.css";

/** Nhóm "Kỳ lương": tự đọc thiết lập (loading/lỗi riêng) rồi hiện thẻ thiết lập và thẻ "Kỳ lương kế tiếp" vào lưới trang. */
export function PayrollPeriodGroup() {
  const settings = useRemote(useCallback((signal: AbortSignal) => readPayrollSettings(signal), []));
  if (settings.loading) return <div className={s.wide}><Skeleton /></div>;
  if (!settings.data) return <div className={s.wide}><ErrorNotice error={settings.error ?? "Chưa đọc được thiết lập kỳ lương."} /><Button type="button" className="w-auto" variant="secondary" onClick={settings.reload}>Thử lại</Button></div>;
  return <PayrollPeriodEditor initial={settings.data} />;
}

function PayrollPeriodEditor({ initial }: { initial: PayrollSettings }) {
  const e = usePayrollSettingsEditor(initial);
  const periods = e.preview.data?.nextPeriods;
  return (
    <>
      <PayrollPeriodFormCard e={e} canSave={!!periods && !e.preview.loading} />
      <PayrollPreviewPanel periods={periods} loading={e.preview.loading} error={e.preview.error} problem={e.problem} onRetry={e.preview.reload} />
    </>
  );
}
