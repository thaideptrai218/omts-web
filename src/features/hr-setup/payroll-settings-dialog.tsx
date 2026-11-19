"use client";
import { useCallback, useMemo, useState } from "react";
import type { z } from "zod";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { InterfaceIcon } from "@/components/ui/interface-icon";
import { SelectBox } from "@/components/ui/select-box";
import { useApiWorkspace } from "@/features/api-workspace/api-workspace-shell";
import { operationAllowed } from "@/features/operations/permissions";
import { createOperationsRepository } from "@/features/operations/repository";
import { ErrorNotice, Skeleton, useRemote } from "@/features/operations/ui";
import { useOperationEditor } from "@/features/operations/use-operation-editor";
import { formatVietnameseDate } from "@/shared/format/date-only";
import { payrollSettingsPreview, payrollSettingsSaved, payrollSettingsView, type PayrollPeriod } from "./payroll-settings-contracts";

const DAYS = Array.from({ length: 28 }, (_, index) => String(index + 1));
const periodText = (period: PayrollPeriod) => `${period.name} (${formatVietnameseDate(period.start)} đến ${formatVietnameseDate(period.end)})`;

/**
 * Thiết lập kỳ lương (LABOR-16, chỉ Chủ hợp tác xã): ngày bắt đầu kỳ 1-28 và "Tự tạo bảng lương".
 * Hai kỳ tiếp theo được backend tính lại theo giá trị đang chọn; trước khi lưu hỏi lại đúng hai kỳ đó (MSG-LABOR-36).
 */
export function PayrollSettingsDialog({ onClose, onSaved }: Readonly<{ onClose(): void; onSaved?(): void }>) {
  const repository = useMemo(() => createOperationsRepository("payroll-settings"), []);
  const settings = useRemote(useCallback((signal: AbortSignal) => repository.read("read", {}, payrollSettingsView, signal), [repository]));
  // Undefined until the Owner changes something: the saved settings are shown meanwhile.
  const [edited, setEdited] = useState<{ day: string; auto: boolean }>();
  const [notice, setNotice] = useState<string>();
  const saved = settings.data;
  const current = edited ?? (saved ? { day: String(saved.payPeriodStartDay), auto: saved.automaticPayroll } : undefined);
  const dirty = !!saved && !!edited && (edited.day !== String(saved.payPeriodStartDay) || edited.auto !== saved.automaticPayroll);
  const editor = useOperationEditor(onClose, dirty);
  const day = current?.day, auto = current?.auto;
  const preview = useRemote<z.infer<typeof payrollSettingsPreview> | null>(useCallback(async (signal: AbortSignal) => {
    if (day === undefined || auto === undefined) return { status: "success" as const, data: null };
    return repository.read("preview", { startDay: day, automaticPayroll: String(auto) }, payrollSettingsPreview, signal);
  }, [repository, day, auto]));
  const periods = (dirty ? preview.data?.nextPeriods : saved?.nextPeriods) ?? [];

  async function save() {
    if (!saved || !current || !dirty) return;
    const [first, second] = periods;
    const question = `Với thiết lập này, các kỳ lương tiếp theo là ${first ? periodText(first) : "chưa xác định"}${second ? ` và ${periodText(second)}` : ""}. Bạn có muốn lưu không?`;
    const result = await editor.submit(question, () => repository.write("save", { payPeriodStartDay: Number(current.day), automaticPayroll: current.auto, rowVersion: saved.rowVersion }, payrollSettingsSaved));
    if (!result) return;
    setEdited(undefined); setNotice("Đã lưu thiết lập kỳ lương."); settings.reload(); onSaved?.();
  }

  return (
    <Dialog open title="Thiết lập kỳ lương" mobileLayout="compact" dismissible={!editor.pending} onOpenChange={(open) => { if (!open) void editor.close(); }}>
      {editor.dialog}
      <form onSubmit={(event) => { event.preventDefault(); void save(); }}>
        <ErrorNotice error={settings.error || editor.mutation.error} />
        {settings.error && <Button type="button" variant="secondary" className="w-auto" onClick={settings.reload}>Tải lại thiết lập</Button>}
        {settings.loading && <Skeleton />}
        {notice && !dirty && <p role="status" className="mb-3 text-sm text-primary">{notice}</p>}
        {current && <fieldset disabled={editor.disabled} className="space-y-4">
          <label className="block text-xs font-medium text-text-muted">Ngày bắt đầu kỳ lương hằng tháng
            <SelectBox aria-label="Ngày bắt đầu kỳ lương" className="omts-control mt-1" value={current.day} onChange={(event) => { setNotice(undefined); setEdited({ ...current, day: event.target.value }); }}>
              {DAYS.map((value) => <option key={value} value={value}>Ngày {value}</option>)}
            </SelectBox>
          </label>
          <label className="flex items-start gap-2 text-sm">
            <input type="checkbox" className="mt-1" checked={current.auto} onChange={(event) => { setNotice(undefined); setEdited({ ...current, auto: event.target.checked }); }} />
            <span>Tự tạo bảng lương<small className="block text-text-muted">Chỉ lưu lựa chọn: hệ thống chưa tự tạo bảng lương khi hết kỳ, hãy tạo bảng lương ở màn Bảng lương.</small></span>
          </label>
          <section aria-label="Các kỳ lương tiếp theo" aria-live="polite">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-text-muted">Hai kỳ lương tiếp theo</h3>
            {dirty && preview.loading ? <Skeleton /> : <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">{periods.map((period) => <li key={period.start}>{periodText(period)}</li>)}</ul>}
            {dirty && preview.error && <ErrorNotice error={preview.error} />}
          </section>
        </fieldset>}
        <div className="mt-5 flex justify-end gap-3">
          <Button className="w-auto" variant="secondary" type="button" disabled={editor.pending} onClick={() => void editor.close()}>Đóng</Button>
          <Button className="w-auto" type="submit" isPending={editor.pending} disabled={!dirty || preview.loading || !!preview.error}>Lưu thiết lập</Button>
        </div>
      </form>
    </Dialog>
  );
}

/** Nút "Thiết lập kỳ lương" cho thanh công cụ màn Bảng lương: tự giữ trạng thái mở/đóng của hộp thoại và chỉ hiện với Chủ hợp tác xã (backend: chỉ Chủ). */
export function PayrollSettingsButton({ onSaved }: Readonly<{ onSaved?(): void }>) {
  const workspace = useApiWorkspace();
  const [open, setOpen] = useState(false);
  if (!operationAllowed("payroll-settings", workspace.identity, workspace.permissions.functionPermissions)) return null;
  return <>
    <Button className="w-auto" variant="secondary" type="button" onClick={() => setOpen(true)}><InterfaceIcon name="calendar" className="mr-1 size-4" />Thiết lập kỳ lương</Button>
    {open && <PayrollSettingsDialog onClose={() => setOpen(false)} onSaved={onSaved} />}
  </>;
}
