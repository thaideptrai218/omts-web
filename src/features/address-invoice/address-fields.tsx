"use client";
import { useMemo } from "react";
import { managementStyles } from "@/components/ui/management-screen/management-table";
import { Field, Select } from "@/features/operations/ui";
import { addressNeedsReview, addressReviewHint, type AddressValue } from "./model";
import { addressRepository, unitsError } from "./repository";
import { useUnits } from "./use-units";

function Failed({ kind, onRetry }: { kind: "province" | "ward"; onRetry(): void }) {
  return <p role="alert" className="mt-1 text-xs text-danger">{unitsError(kind)} <button type="button" className={managementStyles.linkButton} onClick={onRetry}>Thử lại</button></p>;
}

/**
 * Province, then ward, then the street: the only way an address is entered. The province list is read once for the session; the ward list is read
 * when a province is picked and the ward box stays off until then. Picking another province clears the ward, which belongs to the first one.
 * The fields are items of the grid of the section they sit in; the street takes the full row.
 */
export function AddressFields({ value, onChange, required = false, disabled = false }: { value: AddressValue; onChange(next: AddressValue): void; required?: boolean; disabled?: boolean }) {
  const provinces = useUnits(addressRepository.provinces);
  const provinceCode = value.provinceCode;
  const loadWards = useMemo(() => provinceCode ? () => addressRepository.wards(provinceCode) : undefined, [provinceCode]);
  const wards = useUnits(loadWards);
  const star = required ? " *" : "";
  const review = addressNeedsReview(value);
  const old = [value.street, value.wardName, value.provinceName].map((part) => part.trim()).filter(Boolean).join(", ");

  const pickProvince = (code: string) => {
    const picked = provinces.data?.find((item) => String(item.code) === code);
    onChange({ provinceCode: picked?.code ?? null, provinceName: picked?.name ?? "", wardCode: null, wardName: "", street: value.street });
  };
  const pickWard = (code: string) => {
    const picked = wards.data?.find((item) => String(item.code) === code);
    onChange({ ...value, wardCode: picked?.code ?? null, wardName: picked?.name ?? "" });
  };
  const provincePlaceholder = provinces.loading ? "Đang tải…" : "Chọn tỉnh/thành";
  const wardPlaceholder = !provinceCode ? "Chọn tỉnh/thành trước" : wards.loading ? "Đang tải…" : "Chọn phường/xã";

  return <>
    <div>
      <Select searchable searchLabel="Tìm tỉnh/thành" label={`Tỉnh/thành${star}`} value={provinceCode ? String(provinceCode) : ""} disabled={disabled || provinces.loading || provinces.failed} onChange={(event) => pickProvince(event.target.value)}>
        <option value="">{provincePlaceholder}</option>
        {provinces.data?.map((item) => <option key={item.code} value={item.code}>{item.name}</option>)}
      </Select>
      {provinces.failed && <Failed kind="province" onRetry={provinces.retry} />}
    </div>
    <div>
      <Select searchable searchLabel="Tìm phường/xã" label={`Phường/xã${star}`} value={value.wardCode ? String(value.wardCode) : ""} disabled={disabled || !provinceCode || wards.loading || wards.failed} onChange={(event) => pickWard(event.target.value)}>
        <option value="">{wardPlaceholder}</option>
        {wards.data?.map((item) => <option key={item.code} value={item.code}>{item.name}</option>)}
      </Select>
      {wards.failed && <Failed kind="ward" onRetry={wards.retry} />}
    </div>
    {review && <p style={{ gridColumn: "1 / -1" }} className="text-xs text-[#92400e]">{addressReviewHint}{old && <span className="block text-text-muted">Đang lưu: {old}</span>}</p>}
    <div style={{ gridColumn: "1 / -1" }}>
      <Field label={`Số nhà, đường${star}`} maxLength={500} disabled={disabled} value={value.street} onChange={(event) => onChange({ ...value, street: event.target.value })} />
    </div>
  </>;
}
