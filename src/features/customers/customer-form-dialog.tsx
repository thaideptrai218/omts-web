"use client";
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { CollapsibleSection, managementStyles } from "@/components/ui/management-screen/management-table";
import { DatePickerField } from "@/components/ui/management-screen/date-picker-field";
import { useToast } from "@/components/ui/toast-provider";
import { useActionDialog } from "@/components/ui/use-action-dialog";
import { AddressFields } from "@/features/address-invoice/address-fields";
import { InvoiceInfoSection } from "@/features/address-invoice/invoice-info-section";
import { contactAddressOf, contactBody, invoiceBody, invoiceInfoOf, invoiceInfoProblem, sameAddress, type AddressValue, type InvoiceInfoValue } from "@/features/address-invoice/model";
import { listBanks } from "@/features/cash-book/repository";
import { ErrorNotice, Field, Note, Select, useRemote } from "@/features/operations/ui";
import { businessToday } from "@/features/operations/ui";
import { customerTypes, genders, noRequiredFields, type CustomerDetail, type RequiredFields } from "./contracts";
import { customerRepository, errorText, type Failure } from "./repository";
import styles from "./customers.module.css";

type Values = Record<"code" | "name" | "phoneNumber" | "phoneNumber2" | "birthDate" | "gender" | "email" | "facebook" | "note" | "customerType" | "bankBin" | "bankAccountNumber", string>;
const fieldNames: Record<string, string> = {
  Code: "Mã khách hàng", Name: "Tên khách hàng", "Phone number": "Số điện thoại 1", "Second phone number": "Số điện thoại 2", Email: "Email", "Birth date": "Sinh nhật", Facebook: "Facebook", Address: "Địa chỉ",
  Province: "Tỉnh/thành", Ward: "Phường/xã", Street: "Số nhà, đường", Note: "Ghi chú", "Company name": "Tên đơn vị", "Tax code": "Mã số thuế", "Personal tax id": "MST / Số định danh cá nhân", Bank: "Ngân hàng", "Bank account number": "Số tài khoản",
  "Customer type": "Loại khách", Gender: "Giới tính", "Invoice buyer type": "Loại người mua hóa đơn", "Invoice name": "Tên người mua hóa đơn", "Invoice email": "Email nhận hóa đơn điện tử", "Invoice address": "Địa chỉ xuất hóa đơn",
};
const photoTypes = ["image/jpeg", "image/png"], maxPhoto = 2 * 1024 * 1024;
const initialValues = (record: CustomerDetail | null): Values => ({
  code: record?.code ?? "", name: record?.name ?? "", phoneNumber: record?.phoneNumber ?? "", phoneNumber2: record?.phoneNumber2 ?? "", birthDate: record?.birthDate?.slice(0, 10) ?? "", gender: record?.gender ?? "",
  email: record?.email ?? "", facebook: record?.facebook ?? "", note: record?.note ?? "",
  customerType: record?.customerType ?? "Individual", bankBin: record?.bankBin ?? "", bankAccountNumber: record?.bankAccountNumber ?? "",
});
const star = (required: boolean) => required ? " *" : "";
/**
 * The identity fields are the ones that password managers and browser autofill recognise (a name, a phone number, a code) and decorate with an icon of their own,
 * which pushes the typed text to the right of the box. The inputs carry no padding rule for it (they are the shared `omts-control`): these hints turn the helpers off.
 */
const noAutofill = { autoComplete: "off", "data-lpignore": "true", "data-1p-ignore": "true", "data-bwignore": "true", "data-form-type": "other" } as const;
const initials = (name: string) => name.split(/\s+/).filter(Boolean).slice(-2).map((part) => part[0]).join("").toUpperCase() || "KH";

/** The failed save as one line: its message, then the fields the backend named. */
export function problemText(result: Failure) {
  const names = [...(result.problem?.fields ?? []), ...(result.problem?.field ? [result.problem.field] : [])].map((name) => fieldNames[name] ?? name);
  return `${errorText(result)}${names.length ? ` Kiểm tra: ${[...new Set(names)].join(", ")}.` : ""}`;
}

/** The first required field the form leaves empty, as the sentence that asks for it; undefined when all are filled. */
export function missingRequired(values: Record<string, string>, required: RequiredFields) {
  const empty = (key: string) => !values[key]?.trim();
  const rules: [boolean, boolean, string][] = [
    [required.phoneNumber2, empty("phoneNumber2"), "Nhập số điện thoại 2."], [required.email, empty("email"), "Nhập email."], [required.gender, empty("gender"), "Chọn giới tính."],
    [required.birthDate, empty("birthDate"), "Chọn ngày sinh."], [required.address, empty("province"), "Chọn tỉnh/thành."],
    [required.address, empty("ward"), "Chọn phường/xã."], [required.address, empty("address"), "Nhập số nhà, đường."], [required.facebook, empty("facebook"), "Nhập Facebook."], [required.bank, empty("bankBin") || empty("bankAccountNumber"), "Chọn ngân hàng và nhập số tài khoản."],
    [required.taxCode, empty("taxCode"), "Nhập mã số thuế."],
  ];
  return rules.find(([on, missing]) => on && missing)?.[2];
}

/**
 * "+ Khách hàng" (a dialog) and "Chỉnh sửa" (`inline`: the same form in the open row): every field of the profile; the save replaces all of them, so all are
 * always sent. `required` are the optional fields the customer settings of the cooperative make required (marked with *); the name and the first phone number always are.
 */
export function CustomerFormDialog({ record, required = noRequiredFields, inline = false, onClose, onSaved }: { record: CustomerDetail | null; required?: RequiredFields; inline?: boolean; onClose(): void; onSaved(saved: CustomerDetail): void }) {
  const confirmation = useActionDialog(), { notify } = useToast(), fileInput = useRef<HTMLInputElement>(null);
  const [initial] = useState(() => initialValues(record)), [initialContact] = useState(() => contactAddressOf(record)), [initialInvoice] = useState(() => invoiceInfoOf(record, required.taxCode ? "Organization" : "Consumer"));
  const [values, setValues] = useState(initial), [pending, setPending] = useState(false), [error, setError] = useState<string>();
  const [contact, setContact] = useState<AddressValue>(initialContact), [invoice, setInvoice] = useState<InvoiceInfoValue>(initialInvoice);
  const [photo, setPhoto] = useState<File>(), [removePhoto, setRemovePhoto] = useState(false);
  const preview = useMemo(() => photo ? URL.createObjectURL(photo) : undefined, [photo]);
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);
  const banks = useRemote(useCallback((signal: AbortSignal) => listBanks(signal), []));
  const locked = record?.phoneLocked === true, today = businessToday();
  const set = (key: keyof Values) => (event: { target: { value: string } }) => setValues((current) => ({ ...current, [key]: event.target.value }));
  const dirty = (Object.keys(values) as (keyof Values)[]).some((key) => values[key] !== initial[key]) || !sameAddress(contact, initialContact) || JSON.stringify(invoice) !== JSON.stringify(initialInvoice) || !!photo || removePhoto;
  const close = async () => { if (!pending && (!dirty || await confirmation.confirm("Bỏ các thay đổi chưa lưu?"))) onClose(); };
  const shownPhoto = removePhoto ? undefined : preview ?? record?.photoUrl ?? undefined;

  function pickPhoto(file: File | undefined) {
    if (!file) return;
    if (!photoTypes.includes(file.type)) { setError("Ảnh phải là JPEG hoặc PNG."); return; }
    if (file.size > maxPhoto) { setError("Ảnh tối đa 2 MB."); return; }
    setError(undefined); setPhoto(file); setRemovePhoto(false);
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (pending) return;
    if (!values.name.trim()) { setError("Nhập tên khách hàng."); return; }
    if (!values.phoneNumber.trim()) { setError("Nhập số điện thoại 1."); return; }
    const taxId = invoice.buyerType === "Organization" ? invoice.taxCode : invoice.buyerType === "Individual" ? invoice.personalTaxId : "";
    const missing = missingRequired({ ...values, address: contact.street, province: contact.provinceName, ward: contact.wardName, taxCode: taxId }, required);
    if (missing) { setError(invoice.buyerType === "Consumer" && required.taxCode && missing === "Nhập mã số thuế." ? "Hợp tác xã yêu cầu mã số thuế: chọn Doanh nghiệp / Tổ chức hoặc Cá nhân ở mục Thông tin xuất hóa đơn và nhập mã số thuế." : missing); return; }
    const invoiceIssue = invoiceInfoProblem(invoice, contact);
    if (invoiceIssue) { setError(invoiceIssue); return; }
    setPending(true); setError(undefined);
    // The save replaces every field: what is left empty is sent as null so that it is cleared.
    const blank = (value: string) => value.trim() || null;
    const result = await customerRepository.save({
      name: values.name.trim(), code: blank(values.code), phoneNumber: values.phoneNumber.trim(), phoneNumber2: blank(values.phoneNumber2), birthDate: blank(values.birthDate), gender: blank(values.gender),
      email: blank(values.email), facebook: blank(values.facebook), note: blank(values.note), customerType: values.customerType || "Individual",
      bankBin: blank(values.bankBin), bankAccountNumber: blank(values.bankAccountNumber), ...contactBody(contact), ...invoiceBody(invoice), ...(record ? { rowVersion: record.rowVersion } : {}),
    }, record?.id);
    if (result.status !== "success") { setPending(false); setError(problemText(result)); return; }
    let saved = result.data.customer;
    // The photo has its own call; the profile is already saved, so a failed photo is told after the dialog has closed.
    let photoFailure: string | undefined;
    if (photo) { const uploaded = await customerRepository.setPhoto(saved.id, photo); if (uploaded.status === "success") saved = uploaded.data; else photoFailure = errorText(uploaded); }
    else if (removePhoto && record?.photoUrl) { const removed = await customerRepository.removePhoto(saved.id); if (removed.status === "success") saved = removed.data; else photoFailure = errorText(removed); }
    setPending(false);
    if (photoFailure) notify({ tone: "danger", title: `Đã lưu ${saved.code} nhưng chưa cập nhật được ảnh.`, description: photoFailure });
    onSaved(saved);
  }

  const bankList = banks.data ?? [];
  const bankKnown = !values.bankBin || bankList.some((bank) => bank.bin === values.bankBin);
  const invoiceOpen = !!record && initialInvoice.buyerType !== "Consumer" || required.taxCode;
  const content = <div className={managementStyles.theme}>{confirmation.dialog}
    <form onSubmit={submit}>
      <ErrorNotice error={error} />
      <fieldset disabled={pending} className="min-w-0">
        <CollapsibleSection title="Thông tin khách hàng" description="Ảnh, tên, mã và số điện thoại.">
          {/* Fields on the left, the photo in its own column at the far right. */}
          <div className={styles.identity}><div className={styles.identityFields}>
          <Field {...noAutofill} label="Tên khách hàng *" required maxLength={200} value={values.name} onChange={set("name")} />
          <Field {...noAutofill} label="Mã khách hàng" maxLength={30} placeholder="Mã tự động" title="Để trống để hệ thống tự cấp mã KH…" value={values.code} onChange={(event) => setValues((current) => ({ ...current, code: event.target.value.replace(/\s/g, "") }))} />
          <div>
            <Field {...noAutofill} label="Số điện thoại 1 *" required maxLength={20} inputMode="tel" readOnly={locked} value={values.phoneNumber} onChange={set("phoneNumber")} />
            {locked && <p className={styles.hint}><span className={`${styles.badge} ${styles.badgeWarn}`}>Tài khoản thương lái</span> Số điện thoại gắn với tài khoản đăng nhập nên không sửa ở đây.</p>}
          </div>
          <Field {...noAutofill} label={`Số điện thoại 2${star(required.phoneNumber2)}`} maxLength={20} inputMode="tel" value={values.phoneNumber2} onChange={set("phoneNumber2")} />
          </div>
          <div className={styles.photoBox}>
            <span className={styles.photo} aria-hidden={!shownPhoto}>{shownPhoto ? (
              // eslint-disable-next-line @next/next/no-img-element -- a local preview (blob:) or an address signed by the storage
              <img src={shownPhoto} alt={`Ảnh ${values.name || "khách hàng"}`} referrerPolicy="no-referrer" />
            ) : initials(values.name)}</span>
            <div className={styles.photoActions}>
              <div>
                <button type="button" className={managementStyles.linkButton} onClick={() => fileInput.current?.click()}>{shownPhoto ? "Đổi ảnh" : "Chọn ảnh"}</button>
                {shownPhoto && <button type="button" className={managementStyles.linkButton} onClick={() => { setPhoto(undefined); setRemovePhoto(true); }}>Xóa ảnh</button>}
              </div>
              <span>JPEG hoặc PNG, tối đa 2 MB.</span>
              <input ref={fileInput} type="file" className="sr-only" tabIndex={-1} aria-label="Ảnh khách hàng" accept="image/jpeg,image/png" onChange={(event) => { pickPhoto(event.target.files?.[0]); event.target.value = ""; }} />
            </div>
          </div>
          </div>
        </CollapsibleSection>
        <CollapsibleSection title="Thông tin cá nhân" description="Loại khách, sinh nhật, giới tính và các kênh liên hệ khác.">
          <Select label="Loại khách" value={values.customerType} onChange={set("customerType")}>{customerTypes.map(([key, label]) => <option key={key} value={key}>{label}</option>)}</Select>
          <div className="block text-xs font-medium text-text-muted"><span>Sinh nhật{star(required.birthDate)}</span>
            <div className="mt-1.5 flex items-center">
              <DatePickerField label="Sinh nhật" value={values.birthDate} max={today} onChange={(value) => setValues((current) => ({ ...current, birthDate: value }))} />
              {values.birthDate && <button type="button" className={styles.dateClear} onClick={() => setValues((current) => ({ ...current, birthDate: "" }))}>Xóa</button>}
            </div>
          </div>
          <Select label={`Giới tính${star(required.gender)}`} value={values.gender} onChange={set("gender")}><option value="">Chưa chọn</option>{genders.map(([key, label]) => <option key={key} value={key}>{label}</option>)}</Select>
          <Field label={`Email${star(required.email)}`} type="email" maxLength={256} value={values.email} onChange={set("email")} />
          <Field label={`Facebook${star(required.facebook)}`} maxLength={300} value={values.facebook} onChange={set("facebook")} />
        </CollapsibleSection>
        <CollapsibleSection title="Địa chỉ" description="Chọn tỉnh/thành, phường/xã rồi nhập số nhà, đường.">
          <AddressFields required={required.address} value={contact} onChange={setContact} />
        </CollapsibleSection>
        <CollapsibleSection title="Ghi chú" defaultOpen={!!record?.note}>
          <div className={styles.wide}><Note label="Ghi chú" maxLength={2000} value={values.note} onChange={set("note")} /></div>
        </CollapsibleSection>
        <CollapsibleSection title="Thông tin xuất hóa đơn" description="Người mua trên hóa đơn điện tử. Khách lấy hóa đơn đỏ cần khai đủ." defaultOpen={invoiceOpen}>
          <InvoiceInfoSection allowConsumer contactName={values.name.trim()} value={invoice} onChange={setInvoice} />
        </CollapsibleSection>
        <CollapsibleSection title="Ngân hàng" description="Tài khoản của khách, dùng khi chuyển trả tiền." defaultOpen={!!record?.bankBin || required.bank}>
          <Select label={`Ngân hàng${star(required.bank)}`} value={values.bankBin} disabled={!!banks.error || banks.loading} onChange={(event) => setValues((current) => ({ ...current, bankBin: event.target.value, ...(event.target.value ? {} : { bankAccountNumber: "" }) }))}>
            <option value="">Chưa chọn</option>
            {!bankKnown && <option value={values.bankBin}>{record?.bankName ?? values.bankBin}</option>}
            {bankList.map((bank) => <option key={bank.bin} value={bank.bin}>{bank.shortName} - {bank.name}</option>)}
          </Select>
          <Field label={`Số tài khoản${star(required.bank)}`} maxLength={30} inputMode="numeric" autoComplete="off" disabled={!values.bankBin} value={values.bankAccountNumber} onChange={set("bankAccountNumber")} />
          {banks.error && <p className={`${styles.hint} ${styles.wide}`}>Chưa tải được danh sách ngân hàng nên chưa đổi được thông tin này; thông tin hiện có được giữ nguyên.</p>}
        </CollapsibleSection>
      </fieldset>
      <div className="mt-5 flex justify-end gap-3">
        <Button className="w-auto" variant="secondary" disabled={pending} onClick={() => void close()}>Bỏ qua</Button>
        <Button className="w-auto" type="submit" isPending={pending} disabled={record !== null && !dirty}>Lưu</Button>
      </div>
    </form>
  </div>;
  if (inline) return content;
  return <Dialog open size="xl" title={record ? `Sửa khách hàng ${record.code}` : "Thêm khách hàng"} dismissible={!pending} onOpenChange={(open) => { if (!open) void close(); }}>{content}</Dialog>;
}
