"use client";
import { useCallback, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { DatePickerField } from "@/components/ui/management-screen/date-picker-field";
import { createOperationsRepository } from "@/features/operations/repository";
import { businessToday, ErrorNotice, Skeleton, useRemote } from "@/features/operations/ui";
import { formatVndWithSymbol } from "@/shared/format/vnd";
import { endingConsequencesSchema, type Employee, type EndingConsequences } from "./contracts";
import { dateLabel } from "./employee-editor-model";

export type EndEmploymentChoice = Readonly<{ lastWorkingDay: string; lockAccount: boolean }>;

/** The consequences that need the Owner's attention, as short lines; empty when ending changes nothing else. */
export function consequenceLines(preview: EndingConsequences): string[] {
  const lines: string[] = [];
  if (preview.futureAssignments.length) lines.push(`${preview.futureAssignments.length} phân công từ ngày sau sẽ bị gỡ: ${preview.futureAssignments.map((row) => `${dateLabel(row.date)}${row.place ? ` · ${row.place}` : ""}${row.jobName ? ` · ${row.jobName}` : ""}`).join("; ")}.`);
  if (preview.checkedInNotOut.length) lines.push(`Đã vào làm nhưng chưa ra về ngày ${preview.checkedInNotOut.map(dateLabel).join(", ")}. Hãy sửa chấm công của các ngày này, nếu không bảng lương không chốt được.`);
  if (preview.advanceBalance > 0) lines.push(`Còn tạm ứng chưa trừ ${formatVndWithSymbol(preview.advanceBalance)}.`);
  if (preview.unpaidPayslips > 0) lines.push(`${preview.unpaidPayslips} phiếu lương chưa trả, còn nợ ${formatVndWithSymbol(preview.unpaidAmount)}. Hồ sơ vẫn giữ để trả lương sau.`);
  return lines;
}

/** What happened to the linked account after ending employment, for the confirmation line; undefined when there was nothing to say. */
export function accountNoteText(result: { accountLocked?: boolean; accountNote?: string | null }): string | undefined {
  if (result.accountLocked) return "Đã khóa tài khoản đăng nhập của nhân viên.";
  if (!result.accountNote) return undefined;
  if (result.accountNote === "OwnerOnly") return "Chỉ Chủ hợp tác xã mới khóa được tài khoản đăng nhập.";
  if (result.accountNote === "NoActiveAccount") return undefined;
  return "Chưa khóa được tài khoản đăng nhập; hãy khóa trong mục Tài khoản.";
}

/**
 * Nghỉ việc: chọn ngày làm cuối (không sau hôm nay), xem hậu quả do backend tính cho đúng ngày đó rồi xác nhận.
 * Ô "Khóa tài khoản đăng nhập" chỉ hiện khi nhân viên có tài khoản đang hoạt động mà Chủ hợp tác xã khóa được; mặc định bật.
 */
export function EmployeeEndEmploymentDialog({ baseline, pending, busy, onCancel, onConfirm }: {
  baseline: Employee; pending: boolean; busy(): boolean; onCancel(): void; onConfirm(choice: EndEmploymentChoice): void;
}) {
  const today = businessToday();
  const [day, setDay] = useState(today), [lock, setLock] = useState(true);
  const repository = useMemo(() => createOperationsRepository("employees"), []);
  const preview = useRemote(useCallback((signal: AbortSignal) => repository.read("end-preview", { id: baseline.id, lastWorkingDay: day }, endingConsequencesSchema, signal), [repository, baseline.id, day]));
  const data = preview.data, lines = data ? consequenceLines(data) : [];
  const dayError = !day ? "Hãy chọn ngày làm cuối." : day > today ? "Ngày làm cuối không được sau hôm nay." : undefined;
  const canLock = !!data?.account && data.accountCanBeLocked && data.account.status === "Active";
  const ready = !!data && !preview.loading && !dayError && data.lastWorkingDay === day;
  return (
    <Dialog open title="Nghỉ việc?" mobileLayout="compact" dismissible={!pending} onOpenChange={(open) => { if (!open && !busy()) onCancel(); }}>
      <form onSubmit={(event) => { event.preventDefault(); if (ready) onConfirm({ lastWorkingDay: day, lockAccount: canLock && lock }); }}>
        <p className="text-sm text-text"><strong>{baseline.fullName}</strong> nghỉ việc. Chọn ngày làm cuối; hồ sơ chuyển sang Đã nghỉ việc sau ngày đó và có thể cho làm việc lại sau.</p>
        <div className="mt-4 max-w-xs">
          <label className="block text-xs font-medium text-text-muted">Ngày làm cuối *
            <DatePickerField label="Ngày làm cuối" required value={day} max={today} invalid={!!dayError} onChange={setDay} className="omts-control mt-1" />
          </label>
          {dayError && <p role="alert" className="mt-1 text-xs text-danger">{dayError}</p>}
        </div>
        <section aria-label="Hậu quả của việc nghỉ việc" aria-live="polite" className="mt-4">
          {preview.loading && <Skeleton />}
          <ErrorNotice error={preview.error} />
          {preview.error && <Button type="button" variant="secondary" className="w-auto" onClick={preview.reload}>Tải lại hậu quả</Button>}
          {data && !preview.loading && (lines.length
            ? <ul className="list-disc space-y-1.5 rounded-control border border-border bg-surface-subtle py-3 pl-8 pr-3 text-sm">{lines.map((line) => <li key={line}>{line}</li>)}</ul>
            : <p className="rounded-control border border-border bg-surface-subtle p-3 text-sm text-text-muted">Không có phân công, chấm công dở dang, tạm ứng hay phiếu lương nào cần xử lý.</p>)}
        </section>
        {canLock && <label className="mt-4 flex items-start gap-2 text-sm">
          <input type="checkbox" className="mt-1" checked={lock} onChange={(event) => setLock(event.target.checked)} />
          <span>Khóa tài khoản đăng nhập <strong>@{data?.account?.username}</strong> ngay khi xác nhận.<small className="block text-text-muted">Có hiệu lực ngay, kể cả khi ngày làm cuối là hôm nay. Bỏ chọn nếu chỉ muốn khóa sau.</small></span>
        </label>}
        {!canLock && data?.account && <p className="mt-4 text-xs text-text-muted">Tài khoản đăng nhập @{data.account.username} {data.account.status === "Active" ? "chưa khóa được tự động" : "đã bị khóa"}. Có thể xem lại ở mục Tài khoản.</p>}
        <div className="mt-5 flex justify-end gap-3">
          <Button className="w-auto" variant="secondary" type="button" disabled={pending} onClick={onCancel}>Bỏ qua</Button>
          <Button className="w-auto" type="submit" isPending={pending} disabled={!ready}>Xác nhận nghỉ việc</Button>
        </div>
      </form>
    </Dialog>
  );
}
