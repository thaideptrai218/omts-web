"use client";
import { DatePickerField } from "@/components/ui/management-screen/date-picker-field";
import { control } from "@/features/operations/ui";
import { ROUNDING_OPTIONS, type Rounding } from "./attendance-settings-draft";
import { SettingRow, SettingsGroupFooter } from "./settings-group-parts";
import type { useAttendanceSettingsEditor } from "./use-attendance-settings-editor";
import s from "./payroll-settings-screen.module.css";

/** Nhóm "Cách tính giờ công": giờ nghỉ giữa ca, làm tròn, ngày áp dụng; mỗi lần lưu tạo một phiên bản mới có hiệu lực từ ngày đó. */
export function AttendanceFormCard({ e }: { e: ReturnType<typeof useAttendanceSettingsEditor> }) {
  const { mutation, disabled } = e.editor;
  return (
    <section className={s.card} aria-labelledby="attendance-title">
      {e.editor.dialog}
      <h2 id="attendance-title" className={s.h2}>Cách tính giờ công</h2>
      <fieldset className={s.fieldset} disabled={disabled}>
        <SettingRow id="break" title="Giờ nghỉ giữa ca" help="Khoảng nghỉ trừ khỏi giờ công mỗi ngày.">
          <div className={s.timePair}>
            <input type="time" className={s.time} aria-label="Nghỉ từ" aria-invalid={!!e.problem} value={e.draft.breakFrom} onChange={(ev) => e.setDraft({ breakFrom: ev.target.value })} />
            <span aria-hidden="true">–</span>
            <input type="time" className={s.time} aria-label="Nghỉ đến" aria-invalid={!!e.problem} value={e.draft.breakTo} onChange={(ev) => e.setDraft({ breakTo: ev.target.value })} />
          </div>
        </SettingRow>
        <SettingRow id="rounding" title="Làm tròn giờ công" help="Giờ công mỗi loại công việc trong ngày được làm tròn xuống.">
          <select className={`${control} ${s.select}`} aria-label="Làm tròn giờ công" value={e.draft.rounding} onChange={(ev) => e.setDraft({ rounding: ev.target.value as Rounding })}>
            {ROUNDING_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </SettingRow>
        <SettingRow id="effective" title="Áp dụng từ ngày" help="Thiết lập mới có hiệu lực từ ngày này; các phiên bản cũ được giữ trong lịch sử.">
          <DatePickerField label="Áp dụng từ ngày" className={s.date} value={e.draft.effectiveFrom} invalid={!e.draft.effectiveFrom} onChange={(value) => e.setDraft({ effectiveFrom: value })} />
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
      {e.reloaded && <p role="status" className={s.ok}>Đã đọc thiết lập hiện tại. Bạn có thể lưu lại bản nháp.</p>}
      <SettingsGroupFooter dirty={e.dirty} canSave={!e.problem} saving={mutation.pending} disabled={disabled && !mutation.blocked} blocked={mutation.blocked} reloading={mutation.pending}
        onSave={() => void e.save()} onDiscard={e.discard} onReload={() => void e.reload()} />
    </section>
  );
}
