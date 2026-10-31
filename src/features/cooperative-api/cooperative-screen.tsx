"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { useApiWorkspace } from "@/features/api-workspace/api-workspace-shell";
import { Field, ErrorNotice, Skeleton, useMutation, useRemote } from "@/features/operations/ui";
import { cooperativeFields, cooperativeInputSchema, cooperativeValues, type CooperativeInput, type CooperativeView } from "./contracts";
import { createCooperativeRepository } from "./repository";

export function CooperativeApiScreen() {
  const { identity } = useApiWorkspace();
  return identity.subjectType === "CooperativeOwner" ? <CooperativeLoader /> : <p role="alert">Bạn không có quyền xem hồ sơ này.</p>;
}
function CooperativeLoader() {
  const load = useCallback((signal: AbortSignal) => createCooperativeRepository().read(signal), []);
  const remote = useRemote(load);
  return <section className="max-w-5xl"><h1 className="text-3xl font-semibold">Hồ sơ hợp tác xã</h1>
    {remote.loading && <Skeleton />}<ErrorNotice error={remote.error} />
    {!remote.loading && !remote.data && <Button className="mt-4 w-auto" onClick={remote.reload}>Tải lại hồ sơ</Button>}
    {remote.data && <CooperativeApiEditor initial={remote.data} />}
  </section>;
}
function PublicPreview({ values }: { values: Pick<CooperativeInput, "fullName" | "officeAddress"> }) {
  return <section aria-label="Xem trước thông tin truy xuất" className="my-4 rounded-card border border-primary/30 bg-primary-soft p-5 break-words">
    <h2 className="font-semibold">Xem trước thông tin truy xuất</h2><p className="mt-3 text-xl font-semibold">{values.fullName || "Tên hợp tác xã"}</p><p className="mt-2">{values.officeAddress || "Địa chỉ trụ sở"}</p>
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
  function logoSaved(next: CooperativeView) {
    // A versionless logo mutation may also observe someone else's profile update.
    // Do not silently authorize an old text draft with that newer rowVersion.
    if (dirty && JSON.stringify({ ...cooperativeValues(record), rowVersion: "" }) !== JSON.stringify({ ...cooperativeValues(next), rowVersion: "" })) {
      setRecord({ ...record, logoUrl: next.logoUrl }); setLatest(next); setNeedsReview(true);
    } else { setRecord(next); setValues(dirty ? { ...values, rowVersion: next.rowVersion } : cooperativeValues(next)); }
    setFile(undefined); if (fileInput.current) fileInput.current.value = "";
    setNotice("Đã cập nhật logo. Các thông tin đang nhập được giữ nguyên.");
  }
  return <div className="mt-6 space-y-5">
    <p className="text-text-muted">Trạng thái: {record.status === "Preliminary" ? "Sơ bộ" : record.status === "Completed" ? "Đã hoàn thiện" : record.status}</p>
    <ErrorNotice error={mutation.error || (needsReview ? "Bản ghi đã thay đổi. Hãy đối chiếu dữ liệu mới; bản nháp của bạn vẫn được giữ." : undefined)} />
    {notice && <p role="status" className="rounded-control bg-primary-soft p-3">{notice}</p>}
    <form ref={formRef} noValidate className="space-y-5 rounded-card border border-border bg-surface p-4 sm:p-6" onSubmit={(event) => { event.preventDefault(); if (!mutation.busy() && !blocked && valid()) { setNotice(undefined); setDialog("save"); } }}>
      <fieldset disabled={mutation.pending} className="grid min-w-0 gap-5 sm:grid-cols-2">{cooperativeFields.map(([key, label]) => <div key={key} className={key === "officeAddress" ? "sm:col-span-2" : "min-w-0"}>
        <Field label={label} required={!["email", "website"].includes(key)} type={key === "email" ? "email" : key === "website" ? "url" : "text"} inputMode={key === "phoneNumber" ? "tel" : key === "taxCode" ? "numeric" : undefined}
          value={values[key]} aria-invalid={!!errors[key]} aria-describedby={errors[key] ? `coop-${key}-error` : undefined} onChange={(event) => setValues({ ...values, [key]: event.target.value })} />
        {errors[key] && <p id={`coop-${key}-error`} className="mt-1 text-sm text-danger">{errors[key]}</p>}
      </div>)}
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
      <PublicPreview values={values} />
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
    {blocked && <section className="space-y-4 rounded-card border border-border bg-surface p-4"><Button className="w-auto" variant="secondary" disabled={mutation.pending} onClick={async () => {
      const next = await mutation.run(() => repository.read(), true); if (next) setLatest(next);
    }}>Tải dữ liệu mới để đối chiếu</Button>
      {latest && <div className="space-y-3 break-words"><h2 className="font-semibold">Hồ sơ hiện tại trên hệ thống</h2>{cooperativeFields.map(([key, label]) => <p key={key}>{label}: {latest[key] || "—"}</p>)}<p>Ngành nghề: {latest.businessLines.join("; ") || "—"}</p>
        {!mutation.uncertain && <div className="flex flex-wrap gap-3"><Button className="w-auto" variant="secondary" disabled={mutation.pending} onClick={() => adopt(latest, true)}>Đã đối chiếu, giữ bản nháp để sửa tiếp</Button>
          <Button className="w-auto" variant="secondary" disabled={mutation.pending} onClick={() => adopt(latest, false)}>Dùng dữ liệu đã lưu</Button></div>}
        {mutation.uncertain && <p role="status">Chưa xác định được kết quả lượt ghi. Hãy đối chiếu và mở lại hồ sơ trước khi thực hiện lượt mới.</p>}
      </div>}
    </section>}
    {dialog && <Dialog open title={dialog === "save" ? "Xác nhận lưu hồ sơ" : dialog === "discard" ? "Bỏ thay đổi đang nhập?" : "Xóa logo hợp tác xã?"} dismissible={!mutation.pending} onOpenChange={(open) => { if (!open && !mutation.busy()) setDialog(undefined); }}>
      {dialog === "save" ? <PublicPreview values={values} /> : <p>{dialog === "discard" ? "Các thông tin chưa lưu sẽ bị bỏ." : "Logo hiện tại sẽ được gỡ khỏi hồ sơ. Thông tin đang nhập và các bản truy xuất đã công bố được giữ nguyên."}</p>}
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
