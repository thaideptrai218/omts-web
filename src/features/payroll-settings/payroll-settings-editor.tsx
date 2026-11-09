"use client";
import { Button } from "@/components/ui/button";
import { ErrorNotice } from "@/features/operations/ui";
import type { PayrollSettings } from "./contracts";
import { PayrollPreviewPanel } from "./payroll-preview-panel";
import { PayrollSettingsFormPanel } from "./payroll-settings-form-panel";
import { periodLabel } from "./payroll-settings-draft";
import { usePayrollSettingsEditor } from "./use-payroll-settings-editor";
import s from "./payroll-settings-screen.module.css";

/** Biểu mẫu + xem trước + xử lý xung đột phiên bản; bản nháp luôn được giữ khi cần đọc lại bản hiện tại. */
export function PayrollSettingsEditor({ initial }: { initial: PayrollSettings }) {
  const e = usePayrollSettingsEditor(initial), { mutation } = e.editor;
  const periods = e.preview.data?.nextPeriods;
  return (
    <>
      {e.editor.dialog}
      <div className={s.layout}>
        <div>
          <PayrollSettingsFormPanel draft={e.draft} dirty={e.dirty} problem={e.problem} saving={mutation.pending} disabled={e.editor.disabled}
            canSave={!!periods && !e.preview.loading} onChange={e.setDraft} onSave={() => void e.save()} onDiscard={e.discard} />
          {e.notice && <p role="status" className={s.ok}>{e.notice}</p>}
          {!mutation.blocked && <ErrorNotice error={mutation.error} />}
          {mutation.blocked && (
            <div className={s.conflict} role="alert">
              <p>{e.conflict ? "Thiết lập này vừa được người khác thay đổi. Thay đổi của bạn chưa được lưu." : mutation.error}</p>
              <p>Bản nháp của bạn vẫn được giữ. Hãy đọc lại thiết lập hiện tại để đối chiếu, sau đó lưu lại hoặc hoàn tác.</p>
              <Button className="w-auto" variant="secondary" isPending={mutation.pending} pendingLabel="Đang đọc..." onClick={() => void e.reload()}>Đọc lại thiết lập hiện tại</Button>
            </div>)}
          {e.reloaded && <p role="status" className={s.ok}>Đã đọc thiết lập hiện tại: kỳ bắt đầu ngày {e.base.payPeriodStartDay}, {e.base.automaticPayroll ? "tự động" : "không tự động"} tạo bảng lương; kỳ kế tiếp {periodLabel(e.base.nextPeriods[0])}. Bạn có thể lưu lại bản nháp.</p>}
        </div>
        <PayrollPreviewPanel periods={periods} loading={e.preview.loading} error={e.preview.error} problem={e.problem} onRetry={e.preview.reload} />
      </div>
    </>
  );
}
