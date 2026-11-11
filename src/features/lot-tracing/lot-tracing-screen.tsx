"use client";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { farmingReferenceHref } from "@/features/farming-management/farming-reference-href";
import { Fragment, useState } from "react";
import { Button } from "@/components/ui/button";
import { InterfaceIcon } from "@/components/ui/interface-icon";
import { StatusPill } from "@/components/ui/management-page";
import { FilterGroup, HelpLink, ManagementLayout } from "@/components/ui/management-screen/management-layout";
import { ListStateMessage, ManagementScroller, managementStyles } from "@/components/ui/management-screen/management-table";
import { OpenableTableRow } from "@/components/ui/openable-table-row";
import { OperationHeading } from "@/features/operations/ui";
import farming from "@/features/farming-management/farming-management.module.css";
import { ListSkeleton } from "@/features/farming-management/detail-parts";
import { TraceDetail } from "./trace-detail";
import { TraceCorrectionView } from "./trace-correction-view";
import { formatDay, lotStatusLabel, originLabel, originTone } from "./trace-format";
import { useLotSearch, type SearchMode } from "./use-lot-search";


type Correcting = { raftId: string; cycleId: string };
const modes: readonly (readonly [SearchMode, string, string])[] = [["lotCode", "Mã lô thu hoạch", "Ví dụ B03-20261026"], ["invoiceCode", "Hóa đơn bán", "Ví dụ HD000123"]];

/**
 * SCR-TRACE-01 Truy xuất lô hàng và SCR-TRACE-02 Sửa dữ liệu truy xuất.
 * Trạng thái tìm kiếm nằm ở màn này để quay lại từ màn sửa vẫn thấy đúng lô vừa truy xuất.
 */
export function LotTracingScreen({ helpHref }: { helpHref?: string }) {
  const query = useSearchParams();
  return <LotTracingWorkspace key={query.toString()} helpHref={helpHref} initialCode={query.get("search") ?? query.get("code") ?? ""} initialRecordId={query.get("recordId") ?? undefined} />;
}
function LotTracingWorkspace({ helpHref, initialCode, initialRecordId }: { helpHref?: string; initialCode: string; initialRecordId?: string }) {
  const search = useLotSearch(initialCode, initialRecordId);
  const [correcting, setCorrecting] = useState<Correcting>();
  if (correcting) {
    return (
      <section>
        <OperationHeading title="Sửa dữ liệu truy xuất" description="Sửa những bản ghi mà màn hình Nuôi trồng không còn cho sửa. Mỗi lần sửa cần có lý do và được ghi lại trên trang truy xuất." icon="document" />
        <TraceCorrectionView raftId={correcting.raftId} cycleId={correcting.cycleId} onBack={() => setCorrecting(undefined)} />
      </section>
    );
  }
  const loading = search.state.status === "loading", [, , placeholder] = modes.find(([mode]) => mode === search.mode)!;
  const lots = search.state.status === "done" ? search.state.lots : [];
  const filters = <>
    <div className={farming.railHead}><strong>Tìm theo</strong></div>
    <FilterGroup legend="Loại mã"><div className={managementStyles.pills}>{modes.map(([mode, label]) => <label key={mode} className={managementStyles.pill}>
      <input type="radio" className="sr-only" name="trace-mode" checked={search.mode === mode} onChange={() => search.setMode(mode)} />{label}</label>)}</div></FilterGroup>
  </>;
  return <ManagementLayout storageKey="lot-tracing" icon="search" title="Truy xuất lô hàng" filters={filters} filterLabel="Bộ lọc truy xuất"
    search={<form role="search" onSubmit={(event) => { event.preventDefault(); void search.search(); }}>
      <input type="search" aria-label={search.mode === "lotCode" ? "Mã lô thu hoạch" : "Mã hóa đơn bán"} placeholder={placeholder} maxLength={100} autoComplete="off" value={search.text} onChange={(event) => search.setText(event.target.value)} /></form>}
    actions={<>
      <Button type="button" key="trace" className="w-auto" disabled={!search.valid} isPending={loading} pendingLabel="Đang tìm..." onClick={() => void search.search()}><InterfaceIcon name="search" className="mr-1 size-4" />Truy xuất</Button>
      <HelpLink helpHref={helpHref} />
    </>}>
    <ManagementScroller busy={loading}>
      {search.state.status === "idle" ? <ListStateMessage>Nhập mã lô thu hoạch hoặc mã hóa đơn bán rồi bấm Truy xuất.</ListStateMessage>
        : loading ? <ListSkeleton />
        : search.state.status === "error" ? <ListStateMessage error={search.state.message} onRetry={() => void search.search()} retryLabel="Thử lại" />
        : !lots.length ? <ListStateMessage>Không tìm thấy lô nào khớp trong các vùng bạn được truy xuất.</ListStateMessage>
        : <table className={farming.table}>
          <thead><tr><th scope="col" className={farming.expandCell}><span className="sr-only">Mở dòng</span></th><th scope="col">Mã lô</th><th scope="col">Bè</th><th scope="col">Vùng</th><th scope="col">Ngày thu hoạch</th><th scope="col">Trạng thái lô</th><th scope="col">Nguồn gốc</th></tr></thead>
          <tbody>{lots.map((lot) => <Fragment key={lot.id}>
            <OpenableTableRow data-selected={search.lotId === lot.id || undefined} onOpen={() => search.openLot(search.lotId === lot.id ? undefined : lot.id)}>
              <td className={farming.expandCell}><button type="button" aria-expanded={search.lotId === lot.id} aria-label={`${search.lotId === lot.id ? "Thu gọn" : "Mở"} lô ${lot.lotCode}`} onClick={() => search.openLot(search.lotId === lot.id ? undefined : lot.id)}><InterfaceIcon name={search.lotId === lot.id ? "chevron-down" : "chevron-right"} /></button></td>
              <td className={farming.name}>{lot.lotCode}</td><td><Link href={farmingReferenceHref("raft", { zoneId: lot.zoneId, recordId: lot.raftId, search: lot.raftCode })}>{lot.raftCode}</Link></td><td><Link href={farmingReferenceHref("zone", { recordId: lot.zoneId, search: lot.zoneCode })}>{lot.zoneCode}</Link></td><td>{formatDay(lot.harvestDate)}</td><td>{lotStatusLabel(lot.statusId)}</td>
              <td><StatusPill tone={originTone(lot.originState)}>{originLabel(lot.originState)}</StatusPill></td>
            </OpenableTableRow>
            {search.lotId === lot.id && <tr><td colSpan={7} className={farming.detailCell}><div className={`${managementStyles.viewWidth} ${farming.detailWidth}`}><section className={farming.detail} aria-label="Kết quả truy xuất lô">
              <TraceDetail key={lot.id} lotId={lot.id} onCorrect={(raftId, cycleId) => setCorrecting({ raftId, cycleId })} /></section></div></td></tr>}
          </Fragment>)}</tbody></table>}
    </ManagementScroller>
  </ManagementLayout>;
}
