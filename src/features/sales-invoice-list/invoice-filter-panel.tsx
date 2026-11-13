"use client";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { FilterWorkspace } from "@/components/ui/filter-workspace";
import { CustomerSearch } from "@/features/customer-lookup/customer-search";
import { TimeRangeFilter } from "@/components/ui/management-screen/time-range-filter";
import { isAllTime } from "@/components/ui/management-screen/time-range-model";
import { Select } from "@/features/operations/ui";
import q from "@/features/quality-claims/frame-kit.module.css";
import { InvoiceLotPicker } from "./invoice-lot-picker";
import { MAX_PERIOD_YEARS, type Filters } from "./invoice-list-logic";
import type { ZoneOption } from "./use-invoice-list";
import s from "./invoice-list.module.css";

type Props = {
  filters: Filters; zones: ZoneOption[]; zonesLoading: boolean; zonesError?: string; problem: string | null; busy: boolean; canExport: boolean; exporting: boolean;
  onChange(patch: Partial<Filters>): void; onApply(): void; onReset(): void; onExport(): void; onReloadZones(): void; children: ReactNode;
};

/** Cột lọc bên trái theo SALE-09: thời gian, vùng, khách hàng, lô thu hoạch, trạng thái, tình trạng thu tiền, tiền mặt của tôi chưa được xác nhận. */
export function InvoiceFilterPanel({ filters: f, zones, zonesLoading, zonesError, problem, busy, canExport, exporting, onChange, onApply, onReset, onExport, onReloadZones, children }: Props) {
  return (
    <FilterWorkspace label="Bộ lọc hóa đơn" reset={<button type="button" className={s.linkButton} onClick={onReset} disabled={busy}>Đặt lại</button>}
      filters={<form className="grid gap-3.5" onSubmit={(event) => { event.preventDefault(); onApply(); }}>
        {canExport && <Button type="button" className="w-full" variant="secondary" disabled={exporting || busy} onClick={onExport}>{exporting ? "Đang xuất file..." : "Xuất Excel danh sách"}</Button>}
        <fieldset className="contents" disabled={busy}>
          <TimeRangeFilter legend="Thời gian" value={f.time} onChange={(time) => onChange({ time })} />
          {isAllTime(f.time) && <p className={s.muted}>Toàn thời gian: xem tối đa {MAX_PERIOD_YEARS} năm gần nhất.</p>}
        </fieldset>
        <div>
          <Select label="Vùng nuôi" value={f.zoneId} disabled={busy || zonesLoading} onChange={(event) => onChange({ zoneId: event.target.value })}>
            <option value="">Tất cả vùng của tôi</option>{zones.map((zone) => <option key={zone.id} value={zone.id}>{zone.label}</option>)}
          </Select>
          {zonesError && <p className={s.muted} role="alert">{zonesError} <button type="button" className={s.linkButton} onClick={onReloadZones}>Tải lại</button></p>}
        </div>
        <fieldset className={q.group} disabled={busy}><legend>Khách hàng</legend><CustomerSearch value={f.customer} disabled={busy} onSelect={(customer) => onChange({ customer })} /></fieldset>
        <fieldset className={q.group} disabled={busy}><legend>Lô thu hoạch</legend><InvoiceLotPicker value={f.lot} disabled={busy} onChange={(lot) => onChange({ lot })} /></fieldset>
        <fieldset className={q.group} disabled={busy}><legend>Trạng thái</legend>
          <label className={q.option}><input type="checkbox" checked={f.completed} onChange={(event) => onChange({ completed: event.target.checked })} />Hoàn thành</label>
          <label className={q.option}><input type="checkbox" checked={f.cancelled} onChange={(event) => onChange({ cancelled: event.target.checked })} />Đã hủy</label>
        </fieldset>
        <Select label="Tình trạng thu tiền" value={f.paid} disabled={busy} onChange={(event) => onChange({ paid: event.target.value as Filters["paid"] })}>
          <option value="">Tất cả</option><option value="true">Đã trả đủ</option><option value="false">Còn nợ</option>
        </Select>
        <fieldset className={q.group} disabled={busy}><legend>Tiền mặt</legend>
          <label className={q.option}><input type="checkbox" checked={f.cashMine} onChange={(event) => onChange({ cashMine: event.target.checked })} />Tiền mặt tôi đã thu chưa được xác nhận</label>
        </fieldset>
        {problem && <p className="text-sm text-danger" role="alert">{problem}</p>}
        <Button type="submit" className="w-full" disabled={busy || !!problem}>{busy ? "Đang tải..." : "Xem hóa đơn"}</Button>
      </form>}>
      {children}
    </FilterWorkspace>
  );
}
