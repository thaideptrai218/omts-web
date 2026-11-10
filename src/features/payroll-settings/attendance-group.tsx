"use client";
import { useCallback } from "react";
import { Button } from "@/components/ui/button";
import { ErrorNotice, Skeleton, useRemote } from "@/features/operations/ui";
import { AttendanceFormCard } from "./attendance-form-card";
import { AttendanceHistoryCard } from "./attendance-history-card";
import type { AttendanceSettings } from "./attendance-settings-draft";
import { readAttendanceSettings, useAttendanceSettingsEditor } from "./use-attendance-settings-editor";
import s from "./payroll-settings-screen.module.css";

/** Nhóm "Cách tính giờ công": tự đọc thiết lập (loading/lỗi riêng) rồi hiện thẻ thiết lập và thẻ lịch sử vào lưới trang. */
export function AttendanceGroup() {
  const settings = useRemote(useCallback((signal: AbortSignal) => readAttendanceSettings(signal), []));
  if (settings.loading) return <div className={s.wide}><Skeleton /></div>;
  if (!settings.data) return <div className={s.wide}><ErrorNotice error={settings.error ?? "Chưa đọc được thiết lập chấm công."} /><Button type="button" className="w-auto" variant="secondary" onClick={settings.reload}>Thử lại</Button></div>;
  return <AttendanceEditor initial={settings.data} />;
}

function AttendanceEditor({ initial }: { initial: AttendanceSettings }) {
  const e = useAttendanceSettingsEditor(initial);
  return (
    <>
      <AttendanceFormCard e={e} />
      <AttendanceHistoryCard versions={e.base.versions} />
    </>
  );
}
