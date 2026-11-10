"use client";
import { useState } from "react";
import { useOperationEditor } from "@/features/operations/use-operation-editor";
import { businessToday } from "@/features/operations/ui";
import { workforceRepository } from "@/features/operations/workforce-shared";
import {
  attendanceSettingsSavedSchema, attendanceSettingsSchema, attendancePayload, attendanceProblem, attendanceQuestion, draftOfAttendance, isAttendanceDirty,
  type AttendanceDraft, type AttendanceSettings,
} from "./attendance-settings-draft";

/** Đọc thiết lập chấm công qua BFF của màn nhân công (action "settings"), dùng lại hợp đồng của backend. */
export const readAttendanceSettings = (signal?: AbortSignal) => workforceRepository.read("settings", {}, attendanceSettingsSchema, signal);

/**
 * Trạng thái chỉnh sửa cách tính giờ công: bản đã lưu (base, giữ rowVersion), bản nháp, lưu có xác nhận, và đọc lại khi bị đổi
 * bởi người khác (MSG06) hoặc kết quả chưa rõ. Bản nháp luôn được giữ nguyên.
 */
export function useAttendanceSettingsEditor(initial: AttendanceSettings) {
  const [today] = useState(businessToday);
  const [base, setBase] = useState(initial), [draft, setDraftState] = useState<AttendanceDraft>(() => draftOfAttendance(initial.current, today));
  const [notice, setNotice] = useState<string>(), [reloaded, setReloaded] = useState(false);
  const dirty = isAttendanceDirty(draft, base.current, today), problem = attendanceProblem(draft);
  const editor = useOperationEditor(() => {}, dirty), { mutation } = editor;

  const setDraft = (patch: Partial<AttendanceDraft>) => { setDraftState((d) => ({ ...d, ...patch })); setNotice(undefined); setReloaded(false); };
  const discard = () => { setDraftState(draftOfAttendance(base.current, today)); setNotice(undefined); setReloaded(false); };

  async function save() {
    const body = attendancePayload(draft, base.rowVersion);
    if (!body || editor.pending || mutation.blocked) return;
    const saved = await editor.submit(attendanceQuestion(draft), () => workforceRepository.write("settings", body, attendanceSettingsSavedSchema));
    if (!saved) return;
    setBase(saved.settings); setDraftState(draftOfAttendance(saved.settings.current, today)); setNotice("Đã lưu cách tính giờ công."); setReloaded(false);
  }

  /** Đọc lại bản hiện tại để lấy rowVersion mới; bản nháp được giữ nguyên. */
  async function reload() {
    const latest = await mutation.run(() => readAttendanceSettings(), true);
    if (!latest) return;
    setBase(latest); mutation.reviewed(); setReloaded(true);
  }

  return { base, draft, setDraft, discard, dirty, problem, save, reload, reloaded, notice, editor, conflict: mutation.failure?.code === "MSG06" };
}
