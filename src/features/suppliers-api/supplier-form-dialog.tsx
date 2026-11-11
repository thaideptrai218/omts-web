"use client";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { CollapsibleSection } from "@/components/ui/management-screen/management-table";
import { useActionDialog } from "@/components/ui/use-action-dialog";
import { workspaceError } from "@/features/api-workspace/workspace-error";
import { ErrorNotice, Field, Note, Select } from "@/features/operations/ui";
import { supplierTypes, type SupplierDetail } from "./contracts";
import { supplierRepository } from "./repository";

type Values = Record<"code" | "name" | "phoneNumber" | "email" | "address" | "province" | "ward" | "supplierType" | "note" | "companyName" | "taxCode" | "identityNumber", string>;
const fieldNames: Record<string, string> = { Code: "Mã nhà cung cấp", Name: "Tên nhà cung cấp", "Supplier type": "Nhóm", "Phone number": "Điện thoại", Email: "Email", Address: "Địa chỉ", Province: "Tỉnh/thành", Ward: "Phường/xã", Note: "Ghi chú", "Company name": "Tên công ty", "Tax code": "Mã số thuế", "Identity number": "Số CCCD" };
const initialValues = (record: SupplierDetail | null): Values => ({
  code: record?.code ?? "", name: record?.name ?? "", phoneNumber: record?.phoneNumber ?? "", email: record?.email ?? "", address: record?.address ?? "", province: record?.province ?? "", ward: record?.ward ?? "",
  supplierType: record?.supplierType ?? "", note: record?.note ?? "", companyName: record?.companyName ?? "", taxCode: record?.taxCode ?? "", identityNumber: record?.identityNumber ?? "",
});

export function SupplierFormDialog({ record, onClose, onSaved }: { record: SupplierDetail | null; onClose(): void; onSaved(saved: SupplierDetail): void }) {
  const confirmation = useActionDialog();
  const [initial] = useState(() => initialValues(record));
  const [values, setValues] = useState(initial), [pending, setPending] = useState(false), [error, setError] = useState<string>();
  const set = (key: keyof Values) => (event: { target: { value: string } }) => setValues((current) => ({ ...current, [key]: event.target.value }));
  const dirty = (Object.keys(values) as (keyof Values)[]).some((key) => values[key] !== initial[key]);
  const close = async () => { if (!pending && (!dirty || await confirmation.confirm("Bỏ các thay đổi chưa lưu?"))) onClose(); };
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (pending) return;
    setPending(true); setError(undefined);
    // Empty optional texts are sent as "" so that an update clears them; the backend keeps a field left out.
    const result = await supplierRepository.save({ ...values, code: values.code.trim() || null, supplierType: values.supplierType || null, email: values.email || null, address: values.address || null, ...(record ? { rowVersion: record.rowVersion } : {}) }, record?.id);
    setPending(false);
    if (result.status === "success") { onSaved(result.data); return; }
    const field = result.catalogueProblem?.field;
    setError(`${workspaceError(result)}${field ? ` Kiểm tra: ${fieldNames[field] ?? field}.` : ""}`);
  }
  return <Dialog open size="lg" title={record ? "Sửa nhà cung cấp" : "Thêm nhà cung cấp"} dismissible={!pending} onOpenChange={(open) => { if (!open) void close(); }}>{confirmation.dialog}
    <form onSubmit={submit}>
      <ErrorNotice error={error} />
      <fieldset disabled={pending} className="min-w-0">
        <CollapsibleSection title="Thông tin nhà cung cấp" description="Mã, tên và cách liên hệ.">
          <Field label="Mã nhà cung cấp" maxLength={30} placeholder="Mã tự động" title="Để trống để hệ thống tự cấp mã NCC…" value={values.code} onChange={(event) => setValues((current) => ({ ...current, code: event.target.value.replace(/\s/g, "") }))} />
          <Field label="Tên nhà cung cấp *" required maxLength={200} value={values.name} onChange={set("name")} />
          <Field label="Điện thoại *" required maxLength={20} inputMode="tel" value={values.phoneNumber} onChange={set("phoneNumber")} />
          <Field label="Email" type="email" maxLength={256} value={values.email} onChange={set("email")} />
        </CollapsibleSection>
        <CollapsibleSection title="Địa chỉ">
          <Field label="Địa chỉ" maxLength={500} value={values.address} onChange={set("address")} />
          <Field label="Tỉnh/thành" maxLength={100} value={values.province} onChange={set("province")} />
          <Field label="Phường/xã" maxLength={100} value={values.ward} onChange={set("ward")} />
        </CollapsibleSection>
        <CollapsibleSection title="Nhóm và ghi chú">
          <Select label="Nhóm *" required value={values.supplierType} onChange={set("supplierType")}><option value="">Chọn nhóm</option>{supplierTypes.map(([key, label]) => <option key={key} value={key}>{label}</option>)}</Select>
          <Note label="Ghi chú" maxLength={2000} value={values.note} onChange={set("note")} />
        </CollapsibleSection>
        <CollapsibleSection title="Thông tin xuất hóa đơn" description="Chỉ cần khi nhà cung cấp xuất hóa đơn đỏ." defaultOpen={!!record?.companyName || !!record?.taxCode || !!record?.identityNumber}>
          <Field label="Tên công ty" maxLength={200} value={values.companyName} onChange={set("companyName")} />
          <Field label="Mã số thuế" maxLength={14} value={values.taxCode} onChange={set("taxCode")} />
          <Field label="Số CCCD" maxLength={12} inputMode="numeric" autoComplete="off" value={values.identityNumber} onChange={set("identityNumber")} />
        </CollapsibleSection>
      </fieldset>
      <div className="mt-5 flex justify-end gap-3">
        <Button className="w-auto" variant="secondary" disabled={pending} onClick={() => void close()}>Bỏ qua</Button>
        <Button className="w-auto" type="submit" isPending={pending} disabled={record !== null && !dirty}>Lưu</Button>
      </div>
    </form>
  </Dialog>;
}
