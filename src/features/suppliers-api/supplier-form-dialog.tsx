"use client";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { CollapsibleSection } from "@/components/ui/management-screen/management-table";
import { useActionDialog } from "@/components/ui/use-action-dialog";
import { AddressFields } from "@/features/address-invoice/address-fields";
import { InvoiceInfoSection } from "@/features/address-invoice/invoice-info-section";
import { contactAddressOf, contactBody, invoiceBody, invoiceInfoOf, invoiceInfoProblem, sameAddress, type AddressValue, type InvoiceInfoValue } from "@/features/address-invoice/model";
import { workspaceError } from "@/features/api-workspace/workspace-error";
import { ErrorNotice, Field, Note, Select } from "@/features/operations/ui";
import { supplierTypes, type SupplierDetail } from "./contracts";
import { supplierRepository } from "./repository";

type Values = Record<"code" | "name" | "phoneNumber" | "email" | "supplierType" | "note", string>;
const fieldNames: Record<string, string> = {
  Code: "Mã nhà cung cấp", Name: "Tên nhà cung cấp", "Supplier type": "Nhóm", "Phone number": "Điện thoại", Email: "Email", Address: "Địa chỉ", Province: "Tỉnh/thành", Ward: "Phường/xã", Street: "Số nhà, đường", Note: "Ghi chú",
  "Company name": "Tên công ty", "Tax code": "Mã số thuế", "Personal tax id": "MST / Số định danh cá nhân", "Invoice buyer type": "Loại người mua hóa đơn", "Invoice name": "Tên người mua hóa đơn", "Invoice email": "Email nhận hóa đơn điện tử", "Invoice address": "Địa chỉ xuất hóa đơn",
};
const initialValues = (record: SupplierDetail | null): Values => ({
  code: record?.code ?? "", name: record?.name ?? "", phoneNumber: record?.phoneNumber ?? "", email: record?.email ?? "", supplierType: record?.supplierType ?? "", note: record?.note ?? "",
});

/**
 * "Thêm nhà cung cấp" (a dialog) and "Chỉnh sửa" (`inline`: the same form in the open row). The save replaces every field, so all are always sent.
 * A supplier is always a named party on the invoice: an organisation or an individual, never a consumer.
 */
export function SupplierFormDialog({ record, inline = false, onClose, onSaved }: { record: SupplierDetail | null; inline?: boolean; onClose(): void; onSaved(saved: SupplierDetail): void }) {
  const confirmation = useActionDialog();
  const [initial] = useState(() => initialValues(record)), [initialContact] = useState(() => contactAddressOf(record)), [initialInvoice] = useState(() => invoiceInfoOf(record, "Individual"));
  const [values, setValues] = useState(initial), [pending, setPending] = useState(false), [error, setError] = useState<string>();
  const [contact, setContact] = useState<AddressValue>(initialContact), [invoice, setInvoice] = useState<InvoiceInfoValue>(initialInvoice);
  const set = (key: keyof Values) => (event: { target: { value: string } }) => setValues((current) => ({ ...current, [key]: event.target.value }));
  const dirty = (Object.keys(values) as (keyof Values)[]).some((key) => values[key] !== initial[key]) || !sameAddress(contact, initialContact) || JSON.stringify(invoice) !== JSON.stringify(initialInvoice);
  const close = async () => { if (!pending && (!dirty || await confirmation.confirm("Bỏ các thay đổi chưa lưu?"))) onClose(); };
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (pending) return;
    const invoiceIssue = invoiceInfoProblem(invoice, contact);
    if (invoiceIssue) { setError(invoiceIssue); return; }
    setPending(true); setError(undefined);
    // Empty optional texts are sent as null (a note as "") so that an update clears them; the backend keeps a field left out.
    const result = await supplierRepository.save({
      code: values.code.trim() || null, name: values.name, phoneNumber: values.phoneNumber, email: values.email || null, supplierType: values.supplierType || null, note: values.note,
      ...contactBody(contact), ...invoiceBody(invoice), ...(record ? { rowVersion: record.rowVersion } : {}),
    }, record?.id);
    setPending(false);
    if (result.status === "success") { onSaved(result.data); return; }
    const field = result.catalogueProblem?.field;
    setError(`${workspaceError(result)}${field ? ` Kiểm tra: ${fieldNames[field] ?? field}.` : ""}`);
  }
  const content = <>{confirmation.dialog}
    <form onSubmit={submit}>
      <ErrorNotice error={error} />
      <fieldset disabled={pending} className="min-w-0">
        <CollapsibleSection title="Thông tin nhà cung cấp" description="Mã, tên và cách liên hệ.">
          <Field label="Mã nhà cung cấp" maxLength={30} placeholder="Mã tự động" title="Để trống để hệ thống tự cấp mã NCC…" value={values.code} onChange={(event) => setValues((current) => ({ ...current, code: event.target.value.replace(/\s/g, "") }))} />
          <Field label="Tên nhà cung cấp *" required maxLength={200} value={values.name} onChange={set("name")} />
          <Field label="Điện thoại *" required maxLength={20} inputMode="tel" value={values.phoneNumber} onChange={set("phoneNumber")} />
          <Field label="Email" type="email" maxLength={256} value={values.email} onChange={set("email")} />
        </CollapsibleSection>
        <CollapsibleSection title="Địa chỉ" description="Chọn tỉnh/thành, phường/xã rồi nhập số nhà, đường.">
          <AddressFields value={contact} onChange={setContact} />
        </CollapsibleSection>
        <CollapsibleSection title="Nhóm và ghi chú">
          <Select label="Nhóm *" required value={values.supplierType} onChange={set("supplierType")}><option value="">Chọn nhóm</option>{supplierTypes.map(([key, label]) => <option key={key} value={key}>{label}</option>)}</Select>
          <Note label="Ghi chú" maxLength={2000} value={values.note} onChange={set("note")} />
        </CollapsibleSection>
        <CollapsibleSection title="Thông tin xuất hóa đơn" description="Bên bán trên hóa đơn điện tử của nhà cung cấp.">
          <InvoiceInfoSection allowConsumer={false} contactName={values.name.trim()} value={invoice} onChange={setInvoice} />
        </CollapsibleSection>
      </fieldset>
      <div className="mt-5 flex justify-end gap-3">
        <Button className="w-auto" variant="secondary" disabled={pending} onClick={() => void close()}>Bỏ qua</Button>
        <Button className="w-auto" type="submit" isPending={pending} disabled={record !== null && !dirty}>Lưu</Button>
      </div>
    </form>
  </>;
  if (inline) return content;
  return <Dialog open size="lg" title={record ? "Sửa nhà cung cấp" : "Thêm nhà cung cấp"} dismissible={!pending} onOpenChange={(open) => { if (!open) void close(); }}>{content}</Dialog>;
}
