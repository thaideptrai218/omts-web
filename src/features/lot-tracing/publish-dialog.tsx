"use client";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import type { PublishCheck } from "./contracts";
import { blockLabel, describeGap } from "./trace-format";
import s from "./lot-tracing.module.css";

type Props = { check: PublishCheck; pending: boolean; error?: string; onConfirm(): void; onClose(): void };

/** TRACE-01.2: hỏi lại trước khi công bố. Lô thiếu nguồn gốc hoặc không đủ điều kiện thì chỉ nêu lý do, không cho công bố. */
export function PublishDialog({ check, pending, error, onConfirm, onClose }: Props) {
  const allowed = check.canPublish && check.ready;
  return (
    <Dialog open title={check.republish ? "Công bố lại thông tin nguồn gốc" : "Công bố thông tin nguồn gốc"} dismissible={!pending} onOpenChange={(open) => !open && onClose()}>
      <div className={s.dialogBody}>
        <p><strong className={s.code}>{check.lotCode}</strong></p>
        {!check.canPublish && <p role="alert" className={s.warn}>{blockLabel(check.block)}</p>}
        {check.canPublish && !check.ready && (
          <div role="alert" className={s.warn}>
            <strong>Lô chưa đủ thông tin nguồn gốc để công bố:</strong>
            <ul>{check.missing.map((gap) => <li key={`${gap.kind}-${gap.laneNumber}-${gap.zoneCode}`}>{describeGap(gap)}</li>)}</ul>
          </div>
        )}
        {allowed && (
          <p className={s.question}>
            {check.republish ? "Công bố lại thông tin nguồn gốc của lô" : "Công bố thông tin nguồn gốc của lô"} {check.lotCode}? Trang nguồn gốc của mọi hóa đơn có mã QR bán lô này sẽ hiển thị thông tin nguồn gốc.
          </p>
        )}
        {error && <p role="alert" className={s.error}>{error}</p>}
        <div className={s.dialogActions}>
          <Button key="discard" type="button" className="w-auto" variant="secondary" disabled={pending} onClick={onClose}>{allowed ? "Bỏ qua" : "Đóng"}</Button>
          {allowed && <Button type="button" className="w-auto" isPending={pending} pendingLabel="Đang công bố..." onClick={onConfirm}>{check.republish ? "Công bố lại" : "Công bố"}</Button>}
        </div>
      </div>
    </Dialog>
  );
}
