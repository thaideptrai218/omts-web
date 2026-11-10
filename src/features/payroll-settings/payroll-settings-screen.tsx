"use client";
import { useCallback } from "react";
import { Button } from "@/components/ui/button";
import { useApiWorkspace } from "@/features/api-workspace/api-workspace-shell";
import { InterfaceIcon } from "@/components/ui/interface-icon";
import { ErrorNotice, Skeleton, useRemote } from "@/features/operations/ui";
import { PayrollSettingsEditor } from "./payroll-settings-editor";
import { readPayrollSettings } from "./use-payroll-settings-editor";
import s from "./payroll-settings-screen.module.css";

/** LABOR-16 Thiết lập kỳ lương: Chủ hợp tác xã chọn ngày bắt đầu kỳ lương và bật/tắt tự động tạo bảng lương. Backend chỉ cho Chủ hợp tác xã. */
export function PayrollSettingsScreen() {
  const { identity } = useApiWorkspace();
  const allowed = identity.subjectType === "CooperativeOwner";
  const settings = useRemote(useCallback((signal: AbortSignal) => allowed ? readPayrollSettings(signal) : Promise.resolve({ status: "error" as const, httpStatus: 403, uncertain: false }), [allowed]));
  return (
    <section className={s.page}>
      <header className={s.title}><InterfaceIcon name="settings" className="size-[18px] shrink-0" /><h1>Thiết lập kỳ lương</h1></header>
      {!allowed ? <p role="alert" className={`${s.error} ${s.denied}`}>Chỉ Chủ hợp tác xã được xem và thay đổi thiết lập kỳ lương.</p>
        : settings.loading ? <Skeleton />
        : settings.data ? <PayrollSettingsEditor initial={settings.data} />
        : <><ErrorNotice error={settings.error ?? "Chưa đọc được thiết lập kỳ lương."} /><Button className="w-auto" variant="secondary" onClick={settings.reload}>Thử lại</Button></>}
    </section>
  );
}
