"use client";
import { useCallback, useState } from "react";
import { createOperationsRepository } from "@/features/operations/repository";
import { useOperationEditor } from "@/features/operations/use-operation-editor";
import { useRemote } from "@/features/operations/ui";
import { payrollPreview, payrollSettings, payrollSettingsSaved, savePayrollSettings, type PayrollPreview, type PayrollSettings } from "./contracts";
import { confirmQuestion, draftOf, draftProblem, isDirty, startDayOf, type Draft } from "./payroll-settings-draft";

const repository = createOperationsRepository("payroll-settings");
export const readPayrollSettings = (signal?: AbortSignal) => repository.read("settings", {}, payrollSettings, signal);

/**
 * Trạng thái chỉnh sửa thiết lập kỳ lương: bản đã lưu (base, giữ rowVersion), bản nháp, kết quả xem trước hai kỳ kế tiếp
 * (chỉ đọc, không lưu), và lưu có xác nhận. Khi bản đã bị người khác đổi (MSG06) hoặc kết quả lưu chưa rõ, bản nháp được giữ
 * nguyên; "reload" đọc lại bản hiện tại để lấy rowVersion mới rồi cho phép lưu lại.
 */
export function usePayrollSettingsEditor(initial: PayrollSettings) {
  const [base, setBase] = useState(initial), [draft, setDraftState] = useState<Draft>(() => draftOf(initial)), [notice, setNotice] = useState<string>(), [reloaded, setReloaded] = useState(false);
  const dirty = isDirty(draft, base), problem = draftProblem(draft), day = startDayOf(draft);
  const editor = useOperationEditor(() => {}, dirty), { mutation } = editor;

  const preview = useRemote(useCallback((signal: AbortSignal) => day === undefined
    ? Promise.resolve({ status: "success" as const, data: undefined as PayrollPreview | undefined })
    : repository.read("preview", { startDay: String(day), automaticPayroll: String(draft.automatic) }, payrollPreview, signal), [day, draft.automatic]));

  const setDraft = (patch: Partial<Draft>) => { setDraftState((d) => ({ ...d, ...patch })); setNotice(undefined); setReloaded(false); };
  const discard = () => { setDraftState(draftOf(base)); setNotice(undefined); setReloaded(false); };

  async function save() {
    const body = savePayrollSettings.safeParse({ payPeriodStartDay: day, automaticPayroll: draft.automatic, rowVersion: base.rowVersion });
    if (!body.success || !preview.data || editor.pending || mutation.blocked) return;
    const saved = await editor.submit(confirmQuestion(preview.data.nextPeriods, draft.automatic), () => repository.write("save", body.data, payrollSettingsSaved));
    if (!saved) return;
    setBase(saved.settings); setDraftState(draftOf(saved.settings)); setNotice("Đã lưu thiết lập kỳ lương."); setReloaded(false);
  }

  /** Đọc lại bản hiện tại để lấy rowVersion mới; bản nháp của người dùng được giữ nguyên. */
  async function reload() {
    const latest = await mutation.run(() => readPayrollSettings(), true);
    if (!latest) return;
    setBase(latest); mutation.reviewed(); setReloaded(true);
  }

  return { base, draft, setDraft, discard, dirty, problem, preview, save, reload, reloaded, notice, editor, conflict: mutation.failure?.code === "MSG06" };
}
