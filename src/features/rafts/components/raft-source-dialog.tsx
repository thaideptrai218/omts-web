import { Dialog } from "@/components/ui/dialog";
import { formatVietnameseDate } from "@/shared/format/date-only";
import type { RaftEvent } from "../domain/raft";

export const raftEventLabels: Record<RaftEvent["kind"], string> = {
  seeded: "Gieo giống",
  harvested: "Thu hoạch",
  "written-off": "Ghi nhận hao hụt",
  planned: "Dự kiến thu hoạch",
};
export function RaftSourceDialog({
  from,
  to,
  laneNumber,
  sources,
  onClose,
}: {
  from: number;
  to: number;
  laneNumber: number;
  sources: readonly RaftEvent[];
  onClose(): void;
}) {
  return (
    <Dialog
      open
      title={`Nguồn đoạn làn ${laneNumber}`}
      description={`Từ ${from.toLocaleString("vi-VN")} đến ${to.toLocaleString("vi-VN")} m, tính từ mốc A.`}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      {!sources.length && (
        <p className="leading-7 text-text-muted">
          Chưa có sự kiện được ghi nhận cho đoạn này tại ngày đã chọn.
        </p>
      )}
      <ol className="space-y-4">
        {sources.map((event) => (
          <li key={event.id} className="border-l-2 border-primary/30 pl-4">
            <h3 className="font-semibold">{raftEventLabels[event.kind]}</h3>
            <p className="mt-1 text-sm text-text-muted">
              {formatVietnameseDate(event.date)}
            </p>
            <dl className="mt-3 space-y-2 text-sm">
              <div>
                <dt className="text-text-muted">Phạm vi sự kiện</dt>
                <dd>
                  {event.from.toLocaleString("vi-VN")}–
                  {event.to.toLocaleString("vi-VN")} m từ A
                </dd>
              </div>
              <div>
                <dt className="text-text-muted">Người ghi nhận</dt>
                <dd>{event.recordedBy}</dd>
              </div>
              <div>
                <dt className="text-text-muted">Người xác nhận</dt>
                <dd>{event.confirmedBy ?? "Chưa có thông tin xác nhận"}</dd>
              </div>
              {event.seedLotCode && (
                <div>
                  <dt className="text-text-muted">Lô giống</dt>
                  <dd>{event.seedLotCode}</dd>
                </div>
              )}
              {event.orderCode && (
                <div>
                  <dt className="text-text-muted">Đơn hàng liên quan</dt>
                  <dd>{event.orderCode}</dd>
                </div>
              )}
              {event.reason && (
                <div>
                  <dt className="text-text-muted">Lý do</dt>
                  <dd className="whitespace-pre-wrap break-words">
                    {event.reason}
                  </dd>
                </div>
              )}
            </dl>
          </li>
        ))}
      </ol>
    </Dialog>
  );
}
