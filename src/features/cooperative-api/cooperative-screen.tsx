"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useActionDialog } from "@/components/ui/use-action-dialog";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { ManagementHeading, StatusPill } from "@/components/ui/management-page";
import { useApiWorkspace } from "@/features/api-workspace/api-workspace-shell";
import { Field, Note, ErrorNotice, Skeleton, useMutation, useRemote } from "@/features/operations/ui";
import { cooperativeFields, cooperativeInputSchema, cooperativeValues, type CooperativeInput, type CooperativeView } from "./contracts";
import { createCooperativeRepository } from "./repository";

export function CooperativeApiScreen() {
  const { identity } = useApiWorkspace();
  return identity.subjectType === "CooperativeOwner" ? <CooperativeLoader /> : <p role="alert">Bạn không có quyền xem hồ sơ này.</p>;
}
function CooperativeLoader() {
  const load = useCallback((signal: AbortSignal) => createCooperativeRepository().read(signal), []);
  const remote = useRemote(load);
  return <section className="mx-auto w-full min-w-0 max-w-5xl"><ManagementHeading title="Hồ sơ hợp tác xã" description="Thông tin pháp lý, liên hệ, hình ảnh và nội dung truy xuất của hợp tác xã." icon="settings" />
    {remote.loading && <Skeleton />}<ErrorNotice error={remote.error} />
    {!remote.loading && !remote.data && <Button className="mt-4 w-auto" onClick={remote.reload}>Tải lại hồ sơ</Button>}
    {remote.data && <CooperativeApiEditor initial={remote.data} />}
  </section>;
}
function PublicPreview({ values, record }: { values: CooperativeInput; record: CooperativeView }) {
  const [language, setLanguage] = useState<"vi" | "en">("vi");
  const certificates = (record.publicPreview?.certifications ?? record.certifications).filter(certificate => certificate.state !== "Expired");
  return <section aria-label="Xem trước thông tin truy xuất" className="my-4 min-w-0 space-y-3 rounded-card border border-border bg-surface-subtle p-4 break-words">
    <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="font-semibold">Xem trước thông tin truy xuất</h2><div className="flex gap-2" role="group" aria-label="Ngôn ngữ xem trước"><button type="button" className="rounded-control border border-border px-3 py-2 text-xs aria-pressed:bg-primary aria-pressed:text-white" aria-pressed={language === "vi"} onClick={() => setLanguage("vi")}>Tiếng Việt</button><button type="button" className="rounded-control border border-border px-3 py-2 text-xs aria-pressed:bg-primary aria-pressed:text-white" aria-pressed={language === "en"} onClick={() => setLanguage("en")}>Tiếng Anh</button></div></div>
    {record.coverPhotoUrl && <Image unoptimized width={960} height={280} src={record.coverPhotoUrl} alt="Ảnh bìa hợp tác xã" className="max-h-52 w-full rounded-control object-cover" />}
    <div className="flex items-center gap-3">{record.logoUrl && <Image unoptimized width={64} height={64} src={record.logoUrl} alt="Logo hợp tác xã" className="size-16 object-contain" />}<div><h3 className="text-lg font-semibold">{values.fullName || "Tên hợp tác xã"}</h3><p className="text-sm text-text-muted">{values.shortName}{values.yearEstablished ? ` · Thành lập năm ${values.yearEstablished}` : ""}</p></div></div>
    <p className="text-sm">{values.officeAddress || "Địa chỉ trụ sở"}</p><p className="text-sm">{[values.phoneNumber, values.email, values.website, values.socialLink].filter(Boolean).join(" · ")}</p>
    <p className="whitespace-pre-wrap text-sm leading-6">{language === "en" ? values.introductionEn || values.introductionVi : values.introductionVi}</p>
    <div className="flex flex-wrap gap-2">{certificates.map(certificate => <StatusPill key={`${certificate.name}:${certificate.number}`} tone={certificate.state === "Valid" ? "success" : "neutral"}>{certificate.name} · {certificate.state === "Valid" ? "Còn hiệu lực" : "Sắp hết hạn"}</StatusPill>)}</div>
  </section>;
}
function CoverPhoto({ record, pending, blocked, onUpload, onRemove }: { record: CooperativeView; pending: boolean; blocked: boolean; onUpload(file: File): Promise<boolean>; onRemove(): Promise<boolean> }) {
  const [file, setFile] = useState<File>(), [error, setError] = useState<string>();
  const input = useRef<HTMLInputElement>(null), confirmation = useActionDialog();
  useEffect(() => { if (!file) return; const prevent = (event: BeforeUnloadEvent) => event.preventDefault(); window.addEventListener("beforeunload", prevent); return () => window.removeEventListener("beforeunload", prevent); }, [file]);
  function clear() { setFile(undefined); if (input.current) input.current.value = ""; }
  return <section aria-label="Ảnh bìa hợp tác xã" className="space-y-4 rounded-card border border-border bg-surface p-4 sm:p-6">{confirmation.dialog}<h2 className="text-lg font-semibold">Ảnh bìa hợp tác xã</h2>{record.coverPhotoUrl ? <Image unoptimized width={960} height={280} src={record.coverPhotoUrl} alt="Ảnh bìa hiện tại của hợp tác xã" className="max-h-52 w-full rounded-control object-cover" /> : <p className="text-sm text-text-muted">Chưa có ảnh bìa.</p>}<p className="text-sm text-text-muted">PNG, JPEG hoặc WebP, tối đa 5 MB. Ảnh bìa lưu riêng; ảnh được thay hoặc xóa sẽ không còn tại đường dẫn cũ.</p>
    <label className="block text-sm font-semibold">Chọn ảnh bìa<input ref={input} type="file" accept="image/png,image/jpeg,image/webp" disabled={pending || blocked} className="mt-2 block max-w-full text-sm" onChange={event => { setError(undefined); const next = event.target.files?.[0]; if (next && (!next.size || next.size > 5*1024*1024 || !["image/png","image/jpeg","image/webp"].includes(next.type))) { clear(); setError("Hãy chọn ảnh PNG, JPEG hoặc WebP không quá 5 MB."); } else setFile(next); }} /></label><ErrorNotice error={error} />
    <div className="flex flex-wrap gap-3"><Button className="w-auto" disabled={!file || pending || blocked} onClick={async () => { if (file && await onUpload(file)) clear(); }}>{record.coverPhotoUrl ? "Thay ảnh bìa" : "Tải ảnh bìa lên"}</Button>{file && <Button className="w-auto" variant="secondary" disabled={pending} onClick={clear}>Bỏ chọn ảnh bìa</Button>}{record.coverPhotoUrl && <Button className="w-auto" variant="secondary" disabled={pending || blocked || !!file} onClick={async () => { if (await confirmation.confirm("Xóa ảnh bìa hiện tại? Ảnh ở đường dẫn cũ sẽ không còn xem được.")) await onRemove(); }}>Xóa ảnh bìa</Button>}</div>
  </section>;
}
export function CooperativeApiEditor({ initial }: { initial: CooperativeView }) {
  const repository = useMemo(() => createCooperativeRepository(), []), mutation = useMutation();
  const [record, setRecord] = useState(initial), [values, setValues] = useState(() => cooperativeValues(initial));
  const [errors, setErrors] = useState<Record<string, string>>({}), [notice, setNotice] = useState<string>();
  const [dialog, setDialog] = useState<"save" | "discard" | "remove-logo">(), [file, setFile] = useState<File>();
  const [fileError, setFileError] = useState<string>(), [latest, setLatest] = useState<CooperativeView>(), [needsReview, setNeedsReview] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null), formRef = useRef<HTMLFormElement>(null);
  const dirty = JSON.stringify(values) !== JSON.stringify(cooperativeValues(record));
  const blocked = mutation.blocked || needsReview;
  useEffect(() => {
    if (!dirty && !file) return;
    const prevent = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", prevent); return () => window.removeEventListener("beforeunload", prevent);
  }, [dirty, file]);
  function valid() {
    const parsed = cooperativeInputSchema.safeParse(values);
    if (parsed.success) { setErrors({}); return parsed.data; }
    const next: Record<string, string> = {};
    for (const issue of parsed.error.issues) { const key = issue.path.join("."); next[key] ??= issue.message; }
    setErrors(next);
    queueMicrotask(() => formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus());
  }
  function adopt(next: CooperativeView, preserve: boolean) {
    setRecord(next); setValues(preserve ? { ...values, rowVersion: next.rowVersion } : cooperativeValues(next));
    setLatest(undefined); setNeedsReview(false); setErrors({}); setNotice(undefined); mutation.reviewed();
  }
  function logoSaved(next: CooperativeView, kind: "logo" | "cover" = "logo") {
    // A versionless logo mutation may also observe someone else's profile update.
    // Do not silently authorize an old text draft with that newer rowVersion.
    if (dirty && JSON.stringify({ ...cooperativeValues(record), rowVersion: "" }) !== JSON.stringify({ ...cooperativeValues(next), rowVersion: "" })) {
      setRecord({ ...record, logoUrl: next.logoUrl, coverPhotoUrl: next.coverPhotoUrl }); setLatest(next); setNeedsReview(true);
    } else { setRecord(next); setValues(dirty ? { ...values, rowVersion: next.rowVersion } : cooperativeValues(next)); }
    if (kind === "logo") { setFile(undefined); if (fileInput.current) fileInput.current.value = ""; }
    setNotice(`Đã cập nhật ${kind === "logo" ? "logo" : "ảnh bìa"}. Các thông tin đang nhập được giữ nguyên.`);
  }
  return <div className="mt-6 space-y-5">
    {record.status && <p className="flex items-center gap-2 text-sm text-text-muted">Trạng thái <StatusPill tone={record.status === "Completed" ? "success" : "neutral"}>{record.status === "Preliminary" ? "Sơ bộ" : record.status === "Completed" ? "Đã hoàn thiện" : record.status}</StatusPill></p>}
    <ErrorNotice error={mutation.error || (needsReview ? "Bản ghi đã thay đổi. Hãy đối chiếu dữ liệu mới; bản nháp của bạn vẫn được giữ." : undefined)} />
    {notice && <p role="status" className="rounded-control bg-primary-soft p-3">{notice}</p>}
    <form ref={formRef} noValidate className="space-y-5 rounded-card border border-border bg-surface p-4 sm:p-6" onSubmit={(event) => { event.preventDefault(); if (!mutation.busy() && !blocked && valid()) { setNotice(undefined); setDialog("save"); } }}>
      <fieldset disabled={mutation.pending} className="grid min-w-0 gap-5 sm:grid-cols-2">{cooperativeFields.map(([key, label]) => <div key={key} className={key === "officeAddress" ? "sm:col-span-2" : "min-w-0"}>
        <Field label={label} required={["fullName", "shortName", "taxCode", "officeAddress", "phoneNumber"].includes(key)} type={key === "email" ? "email" : ["website", "socialLink"].includes(key) ? "url" : "text"} inputMode={key === "phoneNumber" ? "tel" : key === "taxCode" ? "numeric" : undefined}
          value={values[key]} aria-invalid={!!errors[key]} aria-describedby={errors[key] ? `coop-${key}-error` : undefined} onChange={(event) => setValues({ ...values, [key]: event.target.value })} />
        {errors[key] && <p id={`coop-${key}-error`} className="mt-1 text-sm text-danger">{errors[key]}</p>}
      </div>)}
        <div><Field label="Năm thành lập" type="number" min={1900} max={new Date().getFullYear()} step={1} value={values.yearEstablished ?? ""} aria-invalid={!!errors.yearEstablished} onChange={event => setValues({ ...values, yearEstablished: event.target.value ? Number(event.target.value) : null })} />{errors.yearEstablished && <p className="text-sm text-danger">Năm thành lập phải từ 1900 đến năm hiện tại.</p>}</div>
        {(["introductionVi", "introductionEn"] as const).map(key => <div className="sm:col-span-2" key={key}><Note label={key === "introductionVi" ? "Giới thiệu bằng tiếng Việt" : "Giới thiệu bằng tiếng Anh"} maxLength={4000} value={values[key]} aria-invalid={!!errors[key]} onChange={event => setValues({ ...values, [key]: event.target.value })} />{errors[key] && <p className="text-sm text-danger">{errors[key]}</p>}</div>)}
        <section className="min-w-0 space-y-3 sm:col-span-2" aria-label="Ngành nghề kinh doanh"><h2 className="font-semibold">Ngành nghề kinh doanh</h2>
          {values.businessLines.map((line, index) => <div key={index} className="flex items-end gap-2"><div className="min-w-0 flex-1">
            <Field label={`Ngành nghề ${index + 1}`} required value={line} aria-invalid={!!errors[`businessLines.${index}`]} aria-describedby={errors[`businessLines.${index}`] ? `coop-line-${index}` : undefined}
              onChange={(event) => setValues({ ...values, businessLines: values.businessLines.map((value, i) => i === index ? event.target.value : value) })} />
            {errors[`businessLines.${index}`] && <p id={`coop-line-${index}`} className="text-sm text-danger">{errors[`businessLines.${index}`]}</p>}
          </div><Button className="w-auto shrink-0" variant="secondary" aria-label={`Xóa ngành nghề ${index + 1}`} onClick={() => setValues({ ...values, businessLines: values.businessLines.filter((_, i) => i !== index) })}>Xóa</Button></div>)}
          {errors.businessLines && <p role="alert" className="text-sm text-danger">{errors.businessLines}</p>}
          <Button className="w-auto" variant="secondary" onClick={() => setValues({ ...values, businessLines: [...values.businessLines, ""] })}>Thêm ngành nghề</Button>
        </section>
      </fieldset>
      <PublicPreview values={values} record={record} />
      <p className="text-sm text-text-muted">Các bản truy xuất đã công bố giữ thông tin tại lúc công bố. Thay đổi áp dụng cho lần công bố sau.</p>
      <div className="flex flex-wrap gap-3"><Button type="submit" className="w-auto" disabled={blocked || mutation.pending || !dirty}>Lưu hồ sơ</Button>
        <Button className="w-auto" variant="secondary" disabled={mutation.pending || !dirty} onClick={() => setDialog("discard")}>Hủy thay đổi</Button></div>
    </form>
    <section aria-label="Logo hợp tác xã" className="space-y-4 rounded-card border border-border bg-surface p-4 sm:p-6"><h2 className="text-xl font-semibold">Logo hợp tác xã</h2>
      {record.logoUrl ? <a className="inline-block" href={record.logoUrl} target="_blank" rel="noreferrer"><Image unoptimized width={144} height={144} src={record.logoUrl} alt="Logo hiện tại của hợp tác xã" className="max-h-36 max-w-full object-contain" /></a> : <p>Chưa có logo.</p>}
      <p className="text-sm text-text-muted">PNG, JPEG hoặc WebP, tối đa 2 MB. Logo lưu riêng; các thông tin đang nhập vẫn được giữ.</p>
      <label className="block font-semibold">Chọn logo<input ref={fileInput} type="file" accept="image/png,image/jpeg,image/webp" disabled={mutation.pending || blocked} className="mt-2 block max-w-full text-sm" onChange={(event) => {
        const chosen = event.target.files?.[0]; setFile(undefined); setFileError(undefined);
        if (chosen && (!chosen.size || chosen.size > 2 * 1024 * 1024 || !["image/png", "image/jpeg", "image/webp"].includes(chosen.type))) { setFileError("Hãy chọn ảnh PNG, JPEG hoặc WebP không quá 2 MB."); event.target.value = ""; } else setFile(chosen);
      }} /></label>
      <ErrorNotice error={fileError} /><div className="flex flex-wrap gap-3"><Button className="w-auto" isPending={mutation.pending} disabled={!file || blocked} onClick={async () => {
        if (!file || blocked || mutation.busy()) return; setNotice(undefined); const next = await mutation.run(() => repository.upload(file)); if (next) logoSaved(next);
      }}>{record.logoUrl ? "Thay logo" : "Tải logo lên"}</Button>{record.logoUrl && <Button className="w-auto" variant="secondary" disabled={mutation.pending || blocked} onClick={() => setDialog("remove-logo")}>Xóa logo</Button>}</div>
    </section>
    <CoverPhoto record={record} pending={mutation.pending} blocked={blocked} onUpload={async file => { if (blocked || mutation.busy()) return false; setNotice(undefined); const next = await mutation.run(() => repository.uploadCover(file)); if (!next) return false; logoSaved(next, "cover"); return true; }} onRemove={async () => { if (blocked || mutation.busy()) return false; setNotice(undefined); const next = await mutation.run(() => repository.removeCover()); if (!next) return false; logoSaved(next, "cover"); return true; }} />
    <section className="space-y-3 rounded-card border border-border bg-surface p-4 sm:p-6" aria-label="Chứng nhận hợp tác xã"><div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-lg font-semibold">Chứng nhận hợp tác xã</h2><Link href="/cooperative/certifications" className="text-sm font-semibold text-primary underline underline-offset-4">Quản lý chứng nhận</Link></div>{record.certifications.length ? <ul className="divide-y divide-border">{record.certifications.map(certificate => <li key={certificate.id} className="flex flex-wrap justify-between gap-3 py-3"><div><p className="font-medium">{certificate.name}</p><p className="text-sm text-text-muted">{[certificate.number, certificate.issuer, certificate.expiryDate?.split("-").reverse().join("/")].filter(Boolean).join(" · ")}</p></div><StatusPill tone={certificate.state === "Valid" ? "success" : "neutral"}>{certificate.state === "Valid" ? "Còn hiệu lực" : certificate.state === "Expired" ? "Hết hạn" : "Sắp hết hạn"}</StatusPill></li>)}</ul> : <p className="text-sm text-text-muted">Chưa có chứng nhận.</p>}</section>
    {blocked && <section className="space-y-4 rounded-card border border-border bg-surface p-4"><Button className="w-auto" variant="secondary" disabled={mutation.pending} onClick={async () => {
      const next = await mutation.run(() => repository.read(), true); if (next) setLatest(next);
    }}>Tải dữ liệu mới để đối chiếu</Button>
      {latest && <div className="space-y-3 break-words"><h2 className="font-semibold">Hồ sơ hiện tại trên hệ thống</h2>{cooperativeFields.map(([key, label]) => <p key={key}>{label}: {latest[key] || "—"}</p>)}<p>Năm thành lập: {latest.yearEstablished ?? "—"}</p><p className="whitespace-pre-wrap">Giới thiệu tiếng Việt: {latest.introductionVi || "—"}</p><p className="whitespace-pre-wrap">Giới thiệu tiếng Anh: {latest.introductionEn || "—"}</p><p>Ngành nghề: {latest.businessLines.join("; ") || "—"}</p>
        {!mutation.uncertain && <div className="flex flex-wrap gap-3"><Button className="w-auto" variant="secondary" disabled={mutation.pending} onClick={() => adopt(latest, true)}>Đã đối chiếu, giữ bản nháp để sửa tiếp</Button>
          <Button className="w-auto" variant="secondary" disabled={mutation.pending} onClick={() => adopt(latest, false)}>Dùng dữ liệu đã lưu</Button></div>}
        {mutation.uncertain && <p role="status">Chưa xác định được kết quả lượt ghi. Hãy đối chiếu và mở lại hồ sơ trước khi thực hiện lượt mới.</p>}
      </div>}
    </section>}
    {dialog && <Dialog open title={dialog === "save" ? "Xác nhận lưu hồ sơ" : dialog === "discard" ? "Bỏ thay đổi đang nhập?" : "Xóa logo hợp tác xã?"} dismissible={!mutation.pending} onOpenChange={(open) => { if (!open && !mutation.busy()) setDialog(undefined); }}>
      {dialog === "save" ? <PublicPreview values={values} record={record} /> : <p>{dialog === "discard" ? "Các thông tin chưa lưu sẽ bị bỏ." : "Logo hiện tại sẽ được gỡ khỏi hồ sơ. Thông tin đang nhập và các bản truy xuất đã công bố được giữ nguyên."}</p>}
      <div className="mt-5 flex flex-wrap gap-3"><Button className="w-auto" isPending={mutation.pending} disabled={dialog !== "discard" && blocked} onClick={async () => {
        if (mutation.busy()) return;
        if (dialog === "discard") { setValues(cooperativeValues(record)); setErrors({}); setDialog(undefined); return; }
        setNotice(undefined);
        if (dialog === "save") {
          const parsed = valid(); if (!parsed) { setDialog(undefined); return; }
          const next = await mutation.run(() => repository.save(parsed));
          if (next) { setRecord(next); setValues(cooperativeValues(next)); setNotice("Đã lưu hồ sơ hợp tác xã."); }
        } else { const next = await mutation.run(() => repository.remove()); if (next) logoSaved(next); }
        setDialog(undefined);
      }}>{dialog === "save" ? "Xác nhận lưu" : dialog === "discard" ? "Bỏ thay đổi" : "Xác nhận xóa logo"}</Button>
        <Button className="w-auto" variant="secondary" disabled={mutation.pending} onClick={() => setDialog(undefined)}>Tiếp tục sửa</Button></div>
    </Dialog>}
  </div>;
}
