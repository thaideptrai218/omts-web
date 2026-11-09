"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ErrorNotice, OperationHeading, Paging, Skeleton } from "@/features/operations/ui";
import q from "@/features/quality-claims/frame-kit.module.css";
import { InvoiceFilterPanel } from "./invoice-filter-panel";
import { InvoiceListTable } from "./invoice-list-table";
import type { SearchResult } from "./invoice-list-contracts";
import { dateText, num, vnd } from "./invoice-labels";
import { isDefault, pageSize } from "./invoice-list-logic";
import { useInvoiceList } from "./use-invoice-list";
import s from "./invoice-list.module.css";

/** SCR-SALE-05 Hóa đơn bán: danh sách hóa đơn của các vùng bạn được xem, lọc theo kỳ/vùng/khách/lô/trạng thái, chi tiết mở dưới dòng và các lệnh theo quyền (SALE-09). */
export function SalesInvoiceListScreen() {
  const v = useInvoiceList(), { list } = v;
  const [expanded, setExpanded] = useState<string>(), [kept, setKept] = useState<SearchResult>(), [code, setCode] = useState("");
  // Giữ dữ liệu trước đó trong lúc tải lại (sau gửi lại / sửa / hủy) để dòng chi tiết đang mở không bị đóng.
  if (list.data && list.data !== kept) setKept(list.data);
  const data = list.error ? undefined : list.data ?? kept, busy = list.loading;
  const heading = <OperationHeading title="Hóa đơn bán" description="Các hóa đơn của vùng nuôi bạn phụ trách, mới nhất trước; chọn một hóa đơn để xem và thao tác." icon="receipt" />;

  if (!v.canView) {
    return <section>{heading}<div className={s.state} role="alert"><h2>Bạn chưa có quyền xem hóa đơn bán</h2><p>Hãy liên hệ Chủ hợp tác xã để được cấp quyền xem hóa đơn bán của vùng nuôi.</p></div></section>;
  }
  const rows = data?.page.items ?? [];
  return (
    <section>
      {heading}
      <InvoiceFilterPanel filters={v.draft} zones={v.zoneOptions} zonesLoading={v.zones.loading} zonesError={v.zones.error} problem={v.problem} busy={busy}
        canExport={v.canExport} exporting={v.exporting} onChange={v.changeDraft} onApply={() => { setExpanded(undefined); v.apply(); }} onReset={() => { setExpanded(undefined); setCode(""); v.reset(); }}
        onExport={v.exportList} onReloadZones={v.zones.reload}>
        <form className={s.toolbar} role="search" onSubmit={(event) => { event.preventDefault(); setExpanded(undefined); v.searchCode(code.trim()); }}>
          <div className={s.search}>
            <label className="block text-xs font-medium text-text-muted">Tìm theo mã hóa đơn
              <input type="search" value={code} maxLength={50} placeholder="Ví dụ HD000123" onChange={(event) => setCode(event.target.value)} className="mt-1.5 min-h-11 lg:min-h-10 w-full rounded-control border border-border bg-surface px-3 py-2 text-sm text-text" /></label>
            <Button type="submit" className="w-auto" variant="secondary" disabled={busy}>Tìm</Button>
          </div>
        </form>
        <ErrorNotice error={v.exportError} />
        <div aria-live="polite" aria-busy={busy}>
          {busy && !data && <Skeleton />}
          {list.error && <div className={s.state} role="alert"><h2>Chưa tải được danh sách hóa đơn</h2><p>{list.error}</p><Button className="w-auto" variant="secondary" onClick={list.reload}>Thử lại</Button></div>}
          {data && (
            <>
              <dl className={q.stats} aria-label="Tổng hợp hóa đơn">
                <div><dt>Số hóa đơn khớp bộ lọc</dt><dd>{num(data.page.total)}</dd></div>
                <div><dt>Tổng tiền hóa đơn hoàn thành</dt><dd>{vnd(data.completedTotal)}</dd></div>
                <div><dt>Kỳ xem</dt><dd>{data.from === data.to ? dateText(data.from) : `${dateText(data.from)} – ${dateText(data.to)}`}</dd></div>
              </dl>
              {!rows.length ? (
                <div className={s.state}><h2>Không có hóa đơn nào</h2><p>{isDefault(v.applied) ? "Hôm nay chưa có hóa đơn. Hãy chọn kỳ rộng hơn để xem các hóa đơn trước đó." : "Không có hóa đơn nào khớp bộ lọc. Hãy mở rộng kỳ hoặc bỏ bớt bộ lọc."}</p></div>
              ) : (
                <>
                  <InvoiceListTable rows={rows} expandedId={expanded} canExport={v.canExport} onToggle={(id) => setExpanded((current) => (current === id ? undefined : id))} onChanged={list.reload} />
                  <Paging page={v.page} total={data.page.total} pageSize={pageSize} disabled={busy} onChange={(page) => { setExpanded(undefined); v.setPage(page); }} />
                </>
              )}
            </>
          )}
        </div>
      </InvoiceFilterPanel>
    </section>
  );
}
