"use client";
import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/ui/management-page";
import { control, ErrorNotice } from "@/features/operations/ui";
import { formatDay, lotStatusLabel, originLabel, originTone } from "./trace-format";
import type { useLotSearch } from "./use-lot-search";
import s from "./lot-tracing.module.css";

type Search = ReturnType<typeof useLotSearch>;

/** Bước 1 của TRACE-02: tìm theo mã lô thu hoạch hoặc mã hóa đơn bán, chỉ trong các vùng người dùng được truy xuất. */
export function TraceSearchPanel({ search }: { search: Search }) {
  const loading = search.state.status === "loading";
  return (
    <section className={s.card} aria-labelledby="search-title">
      <h2 id="search-title" className={s.h2}>Tìm lô cần truy xuất</h2>
      <form className={s.searchRow} role="search" onSubmit={(event) => { event.preventDefault(); void search.search(); }}>
        <div className={s.seg} role="group" aria-label="Tìm theo">
          <button type="button" aria-pressed={search.mode === "lotCode"} onClick={() => search.setMode("lotCode")}>Mã lô thu hoạch</button>
          <button type="button" aria-pressed={search.mode === "invoiceCode"} onClick={() => search.setMode("invoiceCode")}>Hóa đơn bán</button>
        </div>
        <input className={`${control} ${s.searchInput}`} aria-label={search.mode === "lotCode" ? "Mã lô thu hoạch" : "Mã hóa đơn bán"} maxLength={100} autoComplete="off"
          placeholder={search.mode === "lotCode" ? "Ví dụ B03-20261026" : "Ví dụ HD000123"} value={search.text} onChange={(event) => search.setText(event.target.value)} />
        <Button className="w-auto" type="submit" disabled={!search.valid} isPending={loading} pendingLabel="Đang tìm...">Truy xuất</Button>
      </form>
      <p className={s.hint}>Chỉ tìm trong các vùng bạn được truy xuất. Truy xuất ngược về bè, chu kỳ, lô giống, phiếu nhập và nhà cung cấp; truy xuất xuôi đến hóa đơn và thương lái.</p>
      {search.state.status === "error" && <ErrorNotice error={search.state.message} />}
      {search.state.status === "done" && !search.state.lots.length && <p className={s.empty}>Không tìm thấy lô nào khớp trong các vùng bạn được truy xuất.</p>}
      {search.state.status === "done" && search.state.lots.length > 1 && (
        <ul className={s.resultList} aria-label="Các lô tìm thấy">
          {search.state.lots.map((lot) => (
            <li key={lot.id}>
              <button type="button" className={s.resultItem} aria-current={search.lotId === lot.id} onClick={() => search.openLot(lot.id)}>
                <strong className={s.code}>{lot.lotCode}</strong>
                <span className={s.muted}>Bè {lot.raftCode} · {lot.zoneCode} · {formatDay(lot.harvestDate)} · {lotStatusLabel(lot.statusId)}</span>
                <StatusPill tone={originTone(lot.originState)}>{originLabel(lot.originState)}</StatusPill>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
