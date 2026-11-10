"use client";
import { useState } from "react";
import { OperationHeading } from "@/features/operations/ui";
import { TraceDetail } from "./trace-detail";
import { TraceCorrectionView } from "./trace-correction-view";
import { TraceSearchPanel } from "./trace-search-panel";
import { useLotSearch } from "./use-lot-search";
import s from "./lot-tracing.module.css";

type Correcting = { raftId: string; cycleId: string };

/**
 * SCR-TRACE-01 Truy xuất lô hàng và SCR-TRACE-02 Sửa dữ liệu truy xuất.
 * Trạng thái tìm kiếm nằm ở màn này để quay lại từ màn sửa vẫn thấy đúng lô vừa truy xuất.
 */
export function LotTracingScreen() {
  const search = useLotSearch();
  const [correcting, setCorrecting] = useState<Correcting>();
  if (correcting) {
    return (
      <section>
        <OperationHeading title="Sửa dữ liệu truy xuất" description="Sửa những bản ghi mà màn hình Nuôi trồng không còn cho sửa. Mỗi lần sửa cần có lý do và được ghi lại trên trang truy xuất." icon="document" />
        <TraceCorrectionView raftId={correcting.raftId} cycleId={correcting.cycleId} onBack={() => setCorrecting(undefined)} />
      </section>
    );
  }
  return (
    <section>
      <OperationHeading title="Truy xuất lô hàng" description="Tìm lô thu hoạch hoặc hóa đơn bán để xem nguồn gốc con giống và các hóa đơn đã bán lô." icon="search" />
      <div className={s.stack}>
        <TraceSearchPanel search={search} />
        {search.lotId && <TraceDetail key={search.lotId} lotId={search.lotId} onCorrect={(raftId, cycleId) => setCorrecting({ raftId, cycleId })} />}
      </div>
    </section>
  );
}
