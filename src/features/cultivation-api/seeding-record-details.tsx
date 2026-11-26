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
import { RecordCrewDetail } from "./record-crew-detail";
import flowStyles from "./cultivation-flow.module.css";

/** Read-only detail of one seeding record; edit/delete are offered only while seeding is not completed. */
export function SeedingRecordDetails({ record: v, zoneId, nurseryCode, completed, canAct, canEdit, onEdit, onClose }: {
  record: z.infer<typeof c.seedingRecord>; zoneId: string;
  /** Set for a cycle fed by a nursery batch; the lot of the original purchase is then only context. */
  nurseryCode?: string | null; completed: boolean; canAct: boolean; canEdit: boolean; onEdit(): void; onClose(): void;
}) {
  const fromNursery = nurseryCode !== undefined;
  const unit = fromNursery ? "mảnh (ước tính)" : v.seedLot.unit;
  const photos = (v.photos ?? []).map((photo, index) => ({ ...photo, url: `/api/operations/seeding?action=photo&id=${v.id}&zoneId=${zoneId}&index=${index}` }));
  return <section className={flowStyles.recordDetail} aria-label="Chi tiết lần thả giống">
    <h4>Thả giống · {formatVietnameseDate(v.seedingDate)}</h4>
    <div className={flowStyles.detailLayout}>
      <div>
        <div className={flowStyles.detailStats}>
          <div className={flowStyles.detailStat}><span>Số lượng cả lần thả</span><strong>{v.quantity.toLocaleString("vi-VN")} {unit}</strong></div>
          <div className={flowStyles.detailStat}><span>Làn đã thả</span><strong>{compressLaneNumbers(v.laneNumbers)}</strong></div>
          <div className={flowStyles.detailStat}><span>Ngày thả</span><strong>{formatVietnameseDate(v.seedingDate)}</strong></div>
        </div>
        <section className={flowStyles.detailGroup} aria-label="Nguồn giống"><h5>Nguồn giống</h5><dl>
          {fromNursery
            ? <><dt>Giống</dt><dd>{nurseryCode ?? "Đợt ươm"} · {v.seedLot.itemName ?? "Giống"}</dd></>
            : <>
              <dt>Lô giống</dt><dd>{v.seedLot.code} · {v.seedLot.itemCode ? <Link href={farmingReferenceHref("inputItem", { code: v.seedLot.itemCode })}>{v.seedLot.itemName ?? v.seedLot.itemCode}</Link> : v.seedLot.itemName ?? "Giống"}</dd>
              <dt>Phiếu nhập</dt><dd><Link href={farmingReferenceHref("purchaseReceipt", { code: v.seedLot.receiptCode })}>{v.seedLot.receiptCode}</Link></dd>
              <dt>Nhà cung cấp</dt><dd><Link href={farmingReferenceHref("supplier", { search: v.seedLot.supplierName })}>{v.seedLot.supplierName}</Link></dd>
            </>}
          {v.issueCode && <><dt>Phiếu xuất kho</dt><dd><Link href={farmingReferenceHref("inputUse", { code: v.issueCode })}>{v.issueCode}</Link></dd></>}
        </dl></section>
        <section className={flowStyles.detailGroup} aria-label="Ghi nhận"><h5>Ghi nhận</h5><dl>
          <dt>Người ghi nhận</dt><dd>{v.recordedByName ?? "—"}</dd>
          <dt>Người phụ trách</dt><dd>{v.responsibleName ?? "—"}</dd>
          <dt>Thời điểm</dt><dd>{displayTime(v.recordedAt)}</dd>
        </dl></section>
        <p className={flowStyles.detailNote}>Số lượng thuộc cả lần thả giống, không chia đều cho từng làn.</p>
        {completed && <p>Chu kỳ đã hoàn tất thả giống nên bản ghi chỉ được xem.</p>}
        {!completed && !v.canCorrect && <p>Bản ghi đã khóa theo trạng thái chu kỳ hoặc lô thu hoạch; hiện chỉ được xem.</p>}
        <RecordCrewDetail label="Nhân viên thả giống" crew={v.crew} />
      </div>
      <PhotoGallery photos={photos} label="Ảnh thả giống" />
    </div>
    <RecordHistory kind="seeding" id={v.id} zoneId={zoneId} />
    <footer>
      {!completed && v.canCorrect && canAct && <Button type="button" className="w-auto" onClick={onEdit}>{canEdit ? "Chỉnh sửa lần thả giống" : "Xử lý lần thả giống"}</Button>}
      <Button type="button" className="w-auto" variant="secondary" onClick={onClose}>Thu gọn</Button>
    </footer>
  </section>;
}
