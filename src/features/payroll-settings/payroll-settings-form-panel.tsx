"use client";
import { SelectBox } from "@/components/ui/select-box";
import { Button } from "@/components/ui/button";
import { control } from "@/features/operations/ui";
import { START_DAY_FIRST, START_DAY_LAST } from "./contracts";
import type { Draft } from "./payroll-settings-draft";
import s from "./payroll-settings-screen.module.css";

const days = Array.from({ length: START_DAY_LAST - START_DAY_FIRST + 1 }, (_, i) => START_DAY_FIRST + i);

/** Biểu mẫu thiết lập: ngày bắt đầu kỳ lương (1-28) và tự động tạo bảng lương; nút lưu chỉ mở khi đã có bản xem trước. */
export function PayrollSettingsFormPanel({ draft, disabled, dirty, problem, canSave, saving, onChange, onSave, onDiscard }: {
  draft: Draft; disabled: boolean; dirty: boolean; problem?: string; canSave: boolean; saving: boolean;
  onChange(patch: Partial<Draft>): void; onSave(): void; onDiscard(): void;
}) {
  return (
    <section className={s.card} aria-labelledby="payroll-form-title">
      <h2 id="payroll-form-title" className={s.h2}>Thiết lập hiện tại</h2>
      <fieldset className={s.fieldset} disabled={disabled}>
        <label className={s.field}>
          <span>Ngày bắt đầu kỳ lương</span>
          <SelectBox className={control} value={draft.startDay} aria-describedby="start-day-hint" aria-invalid={!!problem} onChange={(e) => onChange({ startDay: e.target.value })}>
            {days.map((d) => <option key={d} value={d}>Ngày {d} hằng tháng</option>)}
          </SelectBox>
          <small id="start-day-hint" className={s.hint}>Chọn từ ngày {START_DAY_FIRST} đến {START_DAY_LAST} để ngày này có ở mọi tháng. Kỳ được đặt tên theo tháng kết thúc.</small>
        </label>
        <label className={s.switchRow}>
          <input type="checkbox" role="switch" checked={draft.automatic} onChange={(e) => onChange({ automatic: e.target.checked })} />
          <span><strong>Tự động tạo bảng lương</strong><small className={s.hint}>Hệ thống tạo bảng lương của mỗi kỳ mới khi kỳ đó bắt đầu.</small></span>
        </label>
      </fieldset>
      {problem && <p role="alert" className={s.error}>{problem}</p>}
      <div className={s.rule}>Các bảng lương đã tạo giữ nguyên kỳ cũ. Ngày bắt đầu mới được áp dụng từ ngày đầu tiên sau kỳ cuối cùng đã có bảng lương, nên kỳ đầu tiên sau khi đổi có thể ngắn hơn một tháng.</div>
      <div className={s.actions}>
        <Button className="w-auto" isPending={saving} pendingLabel="Đang lưu..." disabled={!dirty || !canSave || disabled} onClick={onSave}>Lưu thiết lập</Button>
        <Button className="w-auto" variant="secondary" disabled={!dirty || disabled} onClick={onDiscard}>Hoàn tác thay đổi</Button>
      </div>
    </section>
  );
}
