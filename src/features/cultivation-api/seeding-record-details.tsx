"use client";
import Link from "next/link";
import type { z } from "zod";
import { PhotoGallery } from "@/components/form/photo-gallery";
import { Button } from "@/components/ui/button";
import { RecordHistory } from "@/features/history/record-history";
import { farmingReferenceHref } from "@/features/farming-management/farming-reference-href";
import { compressLaneNumbers } from "@/features/farming-management/lane-ranges";
import { displayTime } from "@/features/operations/ui";
import { formatVietnameseDate } from "@/shared/format/date-only";
import type * as c from "./records-contracts";
import flowStyles from "./cultivation-flow.module.css";

/** Read-only detail of one seeding record; edit/delete are offered only while seeding is not completed. */
export function SeedingRecordDetails({ record: v, zoneId, nurseryCode, completed, canAct, canEdit, onEdit, onClose }: {
  record: z.infer<typeof c.seedingRecord>; zoneId: string;
  /** Set for a cycle fed by a nursery batch; the lot of the original purchase is then only context. */
  nurseryCode?: string | null; completed: boolean; canAct: boolean; canEdit: boolean; onEdit(): void; onClose(): void;
}) {
  const fromNursery = nurseryCode !== undefined;
  const unit = fromNursery ? "mảnh (ước tính)" : v.seedLot.unit;
  return <section className={flowStyles.recordDetail} aria-label="Chi tiết lần thả giống">
    <h4>Thả giống · {formatVietnameseDate(v.seedingDate)}</h4>
    <dl>
      {fromNursery
        ? <div><dt>Giống</dt><dd>{nurseryCode ?? "Đợt ươm"} · {v.seedLot.itemName ?? "Giống"}</dd></div>
        : <>
          <div><dt>Lô giống</dt><dd>{v.seedLot.code} · {v.seedLot.itemCode ? <Link href={farmingReferenceHref("inputItem", { code: v.seedLot.itemCode })}>{v.seedLot.itemName ?? v.seedLot.itemCode}</Link> : v.seedLot.itemName ?? "Giống"}</dd></div>
          <div><dt>Phiếu nhập</dt><dd><Link href={farmingReferenceHref("purchaseReceipt", { code: v.seedLot.receiptCode })}>{v.seedLot.receiptCode}</Link></dd></div>
          <div><dt>Nhà cung cấp</dt><dd><Link href={farmingReferenceHref("supplier", { search: v.seedLot.supplierName })}>{v.seedLot.supplierName}</Link></dd></div>
        </>}
      {v.issueCode && <div><dt>Phiếu xuất kho</dt><dd><Link href={farmingReferenceHref("inputUse", { code: v.issueCode })}>{v.issueCode}</Link></dd></div>}
      <div><dt>Làn đã thả</dt><dd>{compressLaneNumbers(v.laneNumbers)}</dd></div>
      <div><dt>Số lượng cả lần thả</dt><dd>{v.quantity.toLocaleString("vi-VN")} {unit}</dd></div>
      <div><dt>Người ghi nhận / thời điểm</dt><dd>{v.recordedByName ?? "—"} · {displayTime(v.recordedAt)}</dd></div>
    </dl>
    <p>Số lượng thuộc cả lần thả giống, không chia đều cho từng làn.</p>
    {completed && <p>Chu kỳ đã hoàn tất thả giống nên bản ghi chỉ được xem.</p>}
    {!completed && !v.canCorrect && <p>Bản ghi đã khóa theo trạng thái chu kỳ hoặc lô thu hoạch; hiện chỉ được xem.</p>}
    <PhotoGallery photos={v.photos ?? []} label="Ảnh thả giống" />
    <RecordHistory kind="seeding" id={v.id} zoneId={zoneId} />
    <footer>
      {!completed && v.canCorrect && canAct && <Button type="button" className="w-auto" onClick={onEdit}>{canEdit ? "Chỉnh sửa lần thả giống" : "Xử lý lần thả giống"}</Button>}
      <Button type="button" className="w-auto" variant="secondary" onClick={onClose}>Thu gọn</Button>
    </footer>
  </section>;
}
