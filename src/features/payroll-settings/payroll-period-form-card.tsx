"use client";
import { control } from "@/features/operations/ui";
import { START_DAY_FIRST, START_DAY_LAST } from "./contracts";
import { periodLabel } from "./payroll-settings-draft";
import { SettingRow, SettingsGroupFooter } from "./settings-group-parts";
import type { usePayrollSettingsEditor } from "./use-payroll-settings-editor";
import s from "./payroll-settings-screen.module.css";

const days = Array.from({ length: START_DAY_LAST - START_DAY_FIRST + 1 }, (_, i) => START_DAY_FIRST + i);

/** Nhóm "Kỳ lương": ngày tính lương, tự động tạo bảng lương, chân Bỏ qua/Lưu và thông báo xung đột phiên bản. */
export function PayrollPeriodFormCard({ e, canSave }: { e: ReturnType<typeof usePayrollSettingsEditor>; canSave: boolean }) {
  const { mutation, disabled } = e.editor;
  return (
    <section className={s.card} aria-labelledby="payroll-period-title">
      {e.editor.dialog}
      <h2 id="payroll-period-title" className={s.h2}>Kỳ lương</h2>
      <fieldset className={s.fieldset} disabled={disabled}>
        <SettingRow id="start-day" title="Ngày tính lương" help="Kỳ lương bắt đầu từ ngày này mỗi tháng; kỳ gọi tên theo tháng kết thúc.">
          <select className={`${control} ${s.select}`} aria-label="Ngày tính lương" aria-invalid={!!e.problem} value={e.draft.startDay} onChange={(ev) => e.setDraft({ startDay: ev.target.value })}>
            {days.map((d) => <option key={d} value={d}>Ngày {d}</option>)}
          </select>
        </SettingRow>
        <SettingRow id="automatic" title="Tự động tạo bảng lương" help="Hệ thống tự tạo bảng lương mới khi đến ngày bắt đầu kỳ.">
          <input type="checkbox" role="switch" className={s.switch} aria-label="Tự động tạo bảng lương" checked={e.draft.automatic} onChange={(ev) => e.setDraft({ automatic: ev.target.checked })} />
        </SettingRow>
      </fieldset>
      {e.problem && <p role="alert" className={s.error}>{e.problem}</p>}
      {e.notice && <p role="status" className={s.ok}>{e.notice}</p>}
      {!mutation.blocked && mutation.error && <p role="alert" className={s.error}>{mutation.error}</p>}
      {mutation.blocked && (
        <div className={s.conflict} role="alert">
          <p>{e.conflict ? "Thiết lập này vừa được người khác thay đổi. Thay đổi của bạn chưa được lưu." : mutation.error}</p>
          <p>Bản nháp của bạn vẫn được giữ. Hãy đọc lại thiết lập hiện tại để đối chiếu, sau đó lưu lại hoặc bỏ qua.</p>
        </div>)}
      {e.reloaded && <p role="status" className={s.ok}>Đã đọc thiết lập hiện tại: kỳ bắt đầu ngày {e.base.payPeriodStartDay}, {e.base.automaticPayroll ? "tự động" : "không tự động"} tạo bảng lương; kỳ kế tiếp {periodLabel(e.base.nextPeriods[0])}. Bạn có thể lưu lại bản nháp.</p>}
      <SettingsGroupFooter dirty={e.dirty} canSave={canSave && !e.problem} saving={mutation.pending} disabled={disabled && !mutation.blocked} blocked={mutation.blocked} reloading={mutation.pending}
        onSave={() => void e.save()} onDiscard={e.discard} onReload={() => void e.reload()} />
    </section>
  );
}
