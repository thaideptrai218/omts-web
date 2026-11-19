"use client";
import { useCallback, useMemo } from "react";
import { FilterGroup } from "@/components/ui/management-screen/management-layout";
import { SelectBox } from "@/components/ui/select-box";
import { loadOptions } from "@/features/operations/lookups";
import { useRemote } from "@/features/operations/ui";
import { productRepository } from "@/features/products/repository";
import s from "./report-live.module.css";

export type EntityOption = Readonly<{ id: string; label: string }>;
type Source = Readonly<{ options: EntityOption[]; loading: boolean; error?: string; reload(): void }>;

const byLabel = (a: EntityOption, b: EntityOption) => a.label.localeCompare(b.label, "vi", { numeric: true });

/** Khách hàng để chọn trong bộ lọc; người không đọc được danh sách khách (không có quyền) thấy thông báo nhỏ và vẫn xem được báo cáo. */
export function useCustomerOptions(): Source {
  const remote = useRemote(useCallback((signal: AbortSignal) => loadOptions("customers", signal), []));
  const options = useMemo(() => (remote.data ?? []).map((row) => ({ id: row.id, label: String(row.name ?? row.code ?? row.id) })).sort(byLabel), [remote.data]);
  return { options, loading: remote.loading, error: remote.error, reload: remote.reload };
}

/** Sản phẩm để chọn trong bộ lọc (danh sách chọn của backend: sản phẩm đang bán). */
export function useProductOptions(): Source {
  const remote = useRemote(useCallback((signal: AbortSignal) => productRepository.all({}, signal), []));
  const options = useMemo(() => (remote.data ?? []).map((row) => ({ id: row.id, label: row.name })).sort(byLabel), [remote.data]);
  return { options, loading: remote.loading, error: remote.error, reload: remote.reload };
}

/** Chọn một đối tượng (khách hàng, sản phẩm) hoặc "Tất cả"; lỗi tải danh sách có nút Tải lại. */
export function EntityFilter({ legend, allLabel, value, source, disabled, onChange }: Readonly<{ legend: string; allLabel: string; value: string; source: Source; disabled?: boolean; onChange(id: string): void }>) {
  const known = !value || source.options.some((option) => option.id === value);
  return (
    <FilterGroup legend={legend}>
      <SelectBox aria-label={legend} className="omts-control" value={value} disabled={disabled || source.loading} onChange={(event) => onChange(event.target.value)}>
        <option value="">{allLabel}</option>
        {!known && <option value={value}>Đối tượng đã chọn</option>}
        {source.options.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
      </SelectBox>
      {source.error && <p className={s.error} role="alert">Chưa tải được danh sách. <button type="button" className={s.linkButton} onClick={source.reload}>Tải lại</button></p>}
    </FilterGroup>
  );
}
