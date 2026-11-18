"use client";
import { useEffect, useId, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { managementStyles } from "@/components/ui/management-screen/management-table";
import { ErrorNotice, Field } from "@/features/operations/ui";
import { AddressFields } from "./address-fields";
import { taxCodePattern } from "./contracts";
import { buyerTypes, consumerNote, emptyAddress, type BuyerType, type InvoiceInfoValue } from "./model";
import { addressRepository, lookupError } from "./repository";

const full = { gridColumn: "1 / -1" } as const;
const activeStatus = /đang hoạt động/i;

/**
 * The e-invoice buyer info of a customer or a supplier: who the invoice is for and what it must carry. An organisation gives its tax code, name, address
 * and e-invoice email, and its tax code can be looked up to fill the name and address; an individual gives a name and an address, and may give a tax or
 * identity number and an email; a consumer gives nothing. The fields are items of the grid of the section they sit in.
 * `contactName` is offered as the name of an individual who has none yet. `allowConsumer` is for customers only.
 */
export function InvoiceInfoSection({ value, onChange, contactName = "", allowConsumer }: { value: InvoiceInfoValue; onChange(next: InvoiceInfoValue): void; contactName?: string; allowConsumer: boolean }) {
  const group = useId(), latest = useRef(value);
  useEffect(() => { latest.current = value; });
  const [looking, setLooking] = useState(false), [failure, setFailure] = useState<string>(), [status, setStatus] = useState<string>(), [note, setNote] = useState<string>();
  const set = (patch: Partial<InvoiceInfoValue>) => onChange({ ...value, ...patch });
  const organization = value.buyerType === "Organization", individual = value.buyerType === "Individual";
  const choose = (buyerType: BuyerType) => { setFailure(undefined); set({ buyerType, name: value.name || (buyerType === "Individual" ? contactName : "") }); };

  async function lookup() {
    const taxCode = value.taxCode.trim();
    if (!taxCodePattern.test(taxCode)) { setFailure("Mã số thuế gồm 10 chữ số, hoặc 10 chữ số, dấu gạch ngang và 3 chữ số."); return; }
    setLooking(true); setFailure(undefined); setStatus(undefined); setNote(undefined);
    const result = await addressRepository.lookupTaxCode(taxCode);
    setLooking(false);
    if (result.status !== "success") { setFailure(lookupError(result)); return; }
    const found = result.data, split = !!(found.province && found.ward);
    setStatus(found.status ?? undefined);
    if (!split) setNote("Chưa tách được tỉnh/thành và phường/xã từ địa chỉ tra cứu: địa chỉ đầy đủ được đưa vào ô Số nhà, đường, hãy chọn lại tỉnh/thành và phường/xã.");
    onChange({
      ...latest.current, taxCode: found.taxCode || taxCode, name: found.name, sameAsContact: false,
      address: { ...emptyAddress, ...(found.province ? { provinceCode: found.province.code, provinceName: found.province.name } : {}), ...(found.ward ? { wardCode: found.ward.code, wardName: found.ward.name } : {}), street: found.street ?? (split ? "" : found.address) },
    });
  }

  const address = <>
    <label style={full} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={value.sameAsContact} onChange={(event) => set({ sameAsContact: event.target.checked })} />Giống địa chỉ liên hệ</label>
    {!value.sameAsContact && <AddressFields required value={value.address} onChange={(next) => set({ address: next })} />}
  </>;

  return <>
    <div style={full}>
      <span className="text-xs font-medium text-text-muted" id={`${group}-label`}>Loại người mua hóa đơn</span>
      <div role="radiogroup" aria-labelledby={`${group}-label`} className={`${managementStyles.pills} mt-1.5`}>
        {buyerTypes.filter(([key]) => allowConsumer || key !== "Consumer").map(([key, label]) => <label key={key} className={managementStyles.pill}>
          <input type="radio" className="sr-only" name={`${group}-buyer`} checked={value.buyerType === key} onChange={() => choose(key)} />{label}</label>)}
      </div>
    </div>
    {value.buyerType === "Consumer" && <p style={full} className="rounded-control bg-surface-subtle p-3 text-sm text-text-muted">{consumerNote}</p>}
    {organization && <>
      <div>
        <div className="flex items-end gap-2">
          <div className="min-w-0 flex-1"><Field label="Mã số thuế *" maxLength={14} inputMode="numeric" autoComplete="off" value={value.taxCode} onChange={(event) => { setStatus(undefined); setFailure(undefined); set({ taxCode: event.target.value }); }} /></div>
          <Button className="w-auto" variant="secondary" isPending={looking} pendingLabel="Đang tra cứu…" onClick={() => void lookup()}>Lấy thông tin</Button>
        </div>
        {status && <p className={`mt-1 text-xs ${activeStatus.test(status) ? "text-text-muted" : "text-[#92400e]"}`}>Tình trạng: {status}</p>}
      </div>
      <Field label="Tên đơn vị *" maxLength={200} value={value.name} onChange={(event) => set({ name: event.target.value })} />
      {failure && <div style={full}><ErrorNotice error={failure} /></div>}
      {note && <p style={full} className="text-xs text-[#92400e]">{note}</p>}
      {address}
      <Field label="Email nhận hóa đơn điện tử *" type="email" maxLength={256} value={value.email} onChange={(event) => set({ email: event.target.value })} />
    </>}
    {individual && <>
      <Field label="Họ tên *" maxLength={200} value={value.name} onChange={(event) => set({ name: event.target.value })} />
      <Field label="MST / Số định danh cá nhân (nếu có)" maxLength={14} inputMode="numeric" autoComplete="off" value={value.personalTaxId} onChange={(event) => set({ personalTaxId: event.target.value })} />
      {address}
      <Field label="Email (nếu có)" type="email" maxLength={256} value={value.email} onChange={(event) => set({ email: event.target.value })} />
    </>}
  </>;
}
