"use client";
import { SelectBox } from "@/components/ui/select-box";
import { addressRepository } from "./repository";
import { useUnits } from "./use-units";

/**
 * The province filter of a list: one of the provinces of the shared list, by name (the lists filter on the name stored with the record). While the list is
 * not there, or when it cannot be loaded, the filter is the plain text box it was, so that filtering never stops working.
 */
export function ProvinceFilter({ value, onChange, className }: { value: string; onChange(next: string): void; className: string }) {
  const provinces = useUnits(addressRepository.provinces);
  if (!provinces.data) {
    return <input type="search" aria-label="Tỉnh/thành" className={className} maxLength={100} placeholder={provinces.loading ? "Đang tải…" : "Nhập tỉnh/thành"} value={value} onChange={(event) => onChange(event.target.value)} />;
  }
  const known = !value || provinces.data.some((item) => item.name === value);
  return <SelectBox searchable searchLabel="Tìm tỉnh/thành" aria-label="Tỉnh/thành" className={className} value={value} onChange={(event) => onChange(event.target.value)}>
    <option value="">Tất cả</option>
    {!known && <option value={value}>{value}</option>}
    {provinces.data.map((item) => <option key={item.code} value={item.name}>{item.name}</option>)}
  </SelectBox>;
}
