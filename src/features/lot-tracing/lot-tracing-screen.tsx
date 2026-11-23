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
import { SeedForwardTable } from "./seed-forward-table";
import { useLotSearch, type SearchMode, type TraceFilters } from "./use-lot-search";
import { DetailRow } from "@/components/ui/management-screen/detail-pane";


type Correcting = { raftId: string; cycleId: string };
const modes: readonly (readonly [SearchMode, string, string])[] = [
  ["lotCode", "Mã lô thu hoạch", "Ví dụ B03-20261026"], ["invoiceCode", "Hóa đơn bán", "Ví dụ HD000123"], ["seedLot", "Lô giống / nhà cung cấp", "Ví dụ PN000123-1 hoặc tên nhà cung cấp"],
];
const railField = { display: "grid", gap: 4, fontSize: 12 } as const;
const searchLabel: Record<SearchMode, string> = { lotCode: "Mã lô thu hoạch", invoiceCode: "Mã hóa đơn bán", seedLot: "Mã lô giống hoặc tên nhà cung cấp" };

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
  const setFilter = (key: keyof TraceFilters, value: string) => search.setFilters({ ...search.filters, [key]: value });
  const filters = <>
    <div className={farming.railHead}><strong>Tìm theo</strong></div>
    <FilterGroup legend="Loại mã"><div className={managementStyles.pills}>{modes.map(([mode, label]) => <label key={mode} className={managementStyles.pill}>
      <input type="radio" className="sr-only" name="trace-mode" checked={search.mode === mode} onChange={() => search.setMode(mode)} />{label}</label>)}</div></FilterGroup>
    {search.mode !== "seedLot" && <>
      <FilterGroup legend="Ngày thu hoạch">
        <label style={railField}>Từ ngày<input type="date" value={search.filters.harvestFrom} max={search.filters.harvestTo || undefined} onChange={(event) => setFilter("harvestFrom", event.target.value)} /></label>
        <label style={railField}>Đến ngày<input type="date" value={search.filters.harvestTo} min={search.filters.harvestFrom || undefined} onChange={(event) => setFilter("harvestTo", event.target.value)} /></label>
      </FilterGroup>
      <FilterGroup legend="Bè"><input type="search" aria-label="Mã bè" placeholder="Mã bè" maxLength={100} autoComplete="off" value={search.filters.raftCode} onChange={(event) => setFilter("raftCode", event.target.value)} /></FilterGroup>
      <FilterGroup legend="Sản phẩm"><input type="search" aria-label="Tên sản phẩm" placeholder="Tên sản phẩm" maxLength={100} autoComplete="off" value={search.filters.productName} onChange={(event) => setFilter("productName", event.target.value)} /></FilterGroup>
    </>}
  </>;
  return <ManagementLayout storageKey="lot-tracing" icon="search" title="Truy xuất lô hàng" filters={filters} filterLabel="Bộ lọc truy xuất"
    search={<form role="search" onSubmit={(event) => { event.preventDefault(); void search.search(); }}>
      <input type="search" aria-label={searchLabel[search.mode]} placeholder={placeholder} maxLength={100} autoComplete="off" value={search.text} onChange={(event) => search.setText(event.target.value)} /></form>}
    actions={<>
      <Button type="button" key="trace" className="w-auto" disabled={!search.valid} isPending={loading} pendingLabel="Đang tìm..." onClick={() => void search.search()}><InterfaceIcon name="search" className="mr-1 size-4" />Truy xuất</Button>
      <HelpLink helpHref={helpHref} />
    </>}>
    <ManagementScroller busy={loading}>
      {search.state.status === "idle" ? <ListStateMessage>Nhập mã lô thu hoạch, mã hóa đơn bán, lô giống hoặc nhà cung cấp (hoặc chọn ngày thu hoạch, bè, sản phẩm ở bộ lọc) rồi bấm Truy xuất.</ListStateMessage>
        : loading ? <ListSkeleton />
        : search.state.status === "error" ? <ListStateMessage error={search.state.message} onRetry={() => void search.search()} retryLabel="Thử lại" />
        : search.state.status === "seed" ? (search.state.result.lots.length ? <SeedForwardTable result={search.state.result} /> : <ListStateMessage>Không có lô thu hoạch nào của các vùng bạn được truy xuất lớn lên từ lô giống hoặc nhà cung cấp này.</ListStateMessage>)
        : !lots.length ? <ListStateMessage>Không tìm thấy lô nào khớp trong các vùng bạn được truy xuất.</ListStateMessage>
        : <table className={farming.table}>
          <thead><tr><th scope="col" className={farming.expandCell}><span className="sr-only">Mở dòng</span></th><th scope="col">Mã lô</th><th scope="col">Bè</th><th scope="col">Vùng</th><th scope="col">Ngày thu hoạch</th><th scope="col">Trạng thái lô</th><th scope="col">Nguồn gốc</th></tr></thead>
          <tbody>{lots.map((lot) => <Fragment key={lot.id}>
            <OpenableTableRow data-selected={search.lotId === lot.id || undefined} onOpen={() => search.openLot(search.lotId === lot.id ? undefined : lot.id)}>
              <td className={farming.expandCell}><button type="button" aria-expanded={search.lotId === lot.id} aria-label={`${search.lotId === lot.id ? "Thu gọn" : "Mở"} lô ${lot.lotCode}`} onClick={() => search.openLot(search.lotId === lot.id ? undefined : lot.id)}><InterfaceIcon name={search.lotId === lot.id ? "chevron-down" : "chevron-right"} /></button></td>
              <td className={farming.name}>{lot.lotCode}</td><td><Link href={farmingReferenceHref("raft", { zoneId: lot.zoneId, recordId: lot.raftId, search: lot.raftCode })}>{lot.raftCode}</Link></td><td><Link href={farmingReferenceHref("zone", { recordId: lot.zoneId, search: lot.zoneCode })}>{lot.zoneCode}</Link></td><td>{formatDay(lot.harvestDate)}</td><td>{lotStatusLabel(lot.statusId)}</td>
              <td><StatusPill tone={originTone(lot.originState)}>{originLabel(lot.originState)}</StatusPill></td>
            </OpenableTableRow>
            {search.lotId === lot.id && <DetailRow colSpan={7} className={farming.detailCell}><div className={`${managementStyles.viewWidth} ${farming.detailWidth}`}><section className={farming.detail} aria-label="Kết quả truy xuất lô">
              <TraceDetail key={lot.id} lotId={lot.id} onCorrect={(raftId, cycleId) => setCorrecting({ raftId, cycleId })} /></section></div></DetailRow>}
          </Fragment>)}</tbody></table>}
    </ManagementScroller>
  </ManagementLayout>;
}
