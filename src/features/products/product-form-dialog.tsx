"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { InterfaceIcon } from "@/components/ui/interface-icon";
import { CollapsibleSection, managementStyles } from "@/components/ui/management-screen/management-table";
import { SelectBox } from "@/components/ui/select-box";
import { useToast } from "@/components/ui/toast-provider";
import { useActionDialog } from "@/components/ui/use-action-dialog";
import type { InputUnit } from "@/features/input-items/contracts";
import inputStyles from "@/features/input-items/input-items.module.css";
import { groupLabel, groupTree } from "@/features/input-items/item-helpers";
import { NameDialog } from "@/features/input-items/item-unit-fields";
import { inputRepository } from "@/features/input-items/repository";
import { ErrorNotice, Field, Note, control, useRemote } from "@/features/operations/ui";
import { MoneyInput } from "@/features/purchase-documents/document-parts";
import type { ProductGroup, ProductView } from "./contracts";
import { MAX_PHOTOS, buildSaveBody, initialValues, validateForm, type FormValues } from "./product-helpers";
import { ProductUnitFields } from "./product-unit-fields";
import { errorText, problemText, productRepository } from "./repository";

const photoTypes = ["image/jpeg", "image/png"], maxPhoto = 2 * 1024 * 1024;
const decimalOnly = (value: string) => value.replace(/[^\d.,]/g, "");
const CREATE_GROUP = "__create_group__";

/**
 * "+ Tạo mới", "Sao chép" and "Chỉnh sửa": one form for the product, split into foldable sections. A copy starts from the record without its code, photos or
 * unit codes. `onSaved(saved, again)` runs after every save; with `again` the form stays open, emptied, for the next product.
 */
export function ProductFormDialog({ record, copy, onClose, onSaved }: { record: ProductView | null; copy: boolean; onClose(): void; onSaved(saved: ProductView, again: boolean): void }) {
  const editing = record !== null && !copy, confirmation = useActionDialog(), { notify } = useToast(), fileInput = useRef<HTMLInputElement>(null);
  const [initial] = useState(() => initialValues(record, copy));
  const [values, setValues] = useState<FormValues>(initial), [pending, setPending] = useState(false), [error, setError] = useState<string>();
  const [newPhotos, setNewPhotos] = useState<File[]>([]), [removedPhotos, setRemovedPhotos] = useState<string[]>([]);
  const [nextCode, setNextCode] = useState(""), [codeTick, setCodeTick] = useState(0), [extraGroups, setExtraGroups] = useState<ProductGroup[]>([]), [extraUnits, setExtraUnits] = useState<InputUnit[]>([]);
  const [creating, setCreating] = useState<{ kind: "group" } | { kind: "unit"; rowKey: string }>();
  const groups = useRemote(useCallback((signal: AbortSignal) => productRepository.groups(signal), []));
  const units = useRemote(useCallback((signal: AbortSignal) => inputRepository.units(signal), []));
  const groupList = useMemo(() => [...(groups.data ?? []), ...extraGroups.filter((extra) => !groups.data?.some((row) => row.id === extra.id))], [groups.data, extraGroups]);
  const unitList = useMemo(() => [...(units.data ?? []), ...extraUnits.filter((extra) => !units.data?.some((row) => row.id === extra.id))], [units.data, extraUnits]);
  const existingPhotos = (editing ? record.photos ?? [] : []).filter((photo) => !removedPhotos.includes(photo.id));
  const previews = useMemo(() => newPhotos.map((file) => URL.createObjectURL(file)), [newPhotos]);
  useEffect(() => () => previews.forEach((url) => URL.revokeObjectURL(url)), [previews]);

  // The code a new product would get, shown as the placeholder of the code box; typing a code overrides it.
  useEffect(() => {
    if (editing) return;
    const controller = new AbortController();
    void productRepository.nextCode(controller.signal).then((result) => { if (!controller.signal.aborted && result.status === "success") setNextCode(result.data.code); });
    return () => controller.abort();
  }, [editing, codeTick]);

  const set = (key: "code" | "name" | "categoryId" | "description" | "note") => (event: { target: { value: string } }) => setValues((current) => ({ ...current, [key]: event.target.value }));
  const setNumber = (key: "minKg" | "maxKg") => (event: { target: { value: string } }) => setValues((current) => ({ ...current, [key]: decimalOnly(event.target.value) }));
  const dirty = JSON.stringify(values) !== JSON.stringify(initial) || newPhotos.length > 0 || removedPhotos.length > 0;
  const close = async () => { if (!pending && (!dirty || await confirmation.confirm("Bỏ các thay đổi chưa lưu?"))) onClose(); };

  function pickPhotos(files: FileList | null) {
    const room = MAX_PHOTOS - existingPhotos.length - newPhotos.length, accepted: File[] = [];
    for (const file of Array.from(files ?? [])) {
      if (!photoTypes.includes(file.type)) { setError("Ảnh phải là JPEG hoặc PNG."); return; }
      if (file.size > maxPhoto) { setError("Mỗi ảnh tối đa 2 MB."); return; }
      accepted.push(file);
    }
    if (accepted.length > room) { setError(`Tối đa ${MAX_PHOTOS} ảnh cho một sản phẩm.`); return; }
    setError(undefined); setNewPhotos((current) => [...current, ...accepted]);
  }

  async function submit(again: boolean) {
    if (pending) return;
    const problem = validateForm(values);
    if (problem) { setError(problem); return; }
    setPending(true); setError(undefined);
    const result = await productRepository.save(buildSaveBody(values, editing ? record : null), editing ? record.id : undefined);
    if (result.status !== "success") { setPending(false); setError(problemText(result)); return; }
    // The photos have their own calls; the product is already saved, so a failed photo is told after the form has moved on.
    let saved = result.data, photoFailure: string | undefined;
    for (const photoId of removedPhotos) { const done = await productRepository.removePhoto(saved.id, photoId); if (done.status === "success") saved = done.data; else photoFailure ??= errorText(done); }
    for (const file of newPhotos) { const done = await productRepository.addPhoto(saved.id, file); if (done.status === "success") saved = done.data; else photoFailure ??= errorText(done); }
    setPending(false);
    if (photoFailure) notify({ tone: "danger", title: `Đã lưu ${saved.code} nhưng chưa cập nhật được ảnh.`, description: photoFailure });
    onSaved(saved, again);
    if (again) { setCodeTick((tick) => tick + 1); setValues({ ...initialValues(null, false), categoryId: values.categoryId }); setNewPhotos([]); setRemovedPhotos([]); }
  }

  async function createGroup(name: string) {
    const result = await productRepository.saveGroup(name);
    if (result.status !== "success") return problemText(result);
    setExtraGroups((current) => [...current, result.data]); setValues((current) => ({ ...current, categoryId: result.data.id }));
    notify({ tone: "success", title: `Đã tạo nhóm sản phẩm ${result.data.name}.` }); setCreating(undefined);
    return undefined;
  }
  async function createUnit(name: string, rowKey: string) {
    const result = await inputRepository.saveUnit(name);
    if (result.status !== "success") return problemText(result);
    setExtraUnits((current) => [...current, result.data]);
    setValues((current) => ({ ...current, units: current.units.map((unit) => unit.key === rowKey ? { ...unit, unitId: result.data.id } : unit) }));
    notify({ tone: "success", title: `Đã tạo đơn vị ${result.data.name}.` }); setCreating(undefined);
    return undefined;
  }

  const title = editing ? `Sửa sản phẩm ${record.code}` : copy ? "Sao chép sản phẩm" : "Tạo sản phẩm";
  return <Dialog open size="xl" title={title} dismissible={!pending} onOpenChange={(open) => { if (!open) void close(); }}><div className={managementStyles.theme}>
    {confirmation.dialog}
    <fieldset disabled={pending} className="min-w-0">
      <CollapsibleSection title="Thông tin" description="Mã, tên, nhóm, giá bán theo kg và ảnh sản phẩm." columns={1}>
        <div className={inputStyles.identity}>
          <div className={inputStyles.identityFields}>
            <Field label="Mã sản phẩm" maxLength={30} placeholder={nextCode || "Mã tự động"} title="Để trống để hệ thống tự cấp mã" value={values.code} onChange={(event) => setValues((current) => ({ ...current, code: event.target.value.replace(/\s/g, "") }))} />
            <label className="block text-xs font-medium text-text-muted">Giá bán (đồng/kg) *
              <MoneyInput label="Giá bán theo kg" className={`${control} text-right`} value={values.unitPrice || null} onChange={(unitPrice) => setValues((current) => ({ ...current, unitPrice }))} />
            </label>
            <div className={inputStyles.wide}><Field label="Tên sản phẩm *" required maxLength={200} placeholder="Bắt buộc" value={values.name} onChange={set("name")} /></div>
            <label className={`${inputStyles.wide} block text-xs font-medium text-text-muted`}>Nhóm sản phẩm
              <SelectBox aria-label="Nhóm sản phẩm" className={control} value={values.categoryId} onChange={(event) => { if (event.target.value === CREATE_GROUP) setCreating({ kind: "group" }); else set("categoryId")(event); }}>
                <option value="">Chưa chọn</option>{groupTree(groupList).map((group) => <option key={group.id} value={group.id}>{groupLabel(group)}</option>)}
                <option value={CREATE_GROUP}>+ Tạo nhóm mới</option>
              </SelectBox>
            </label>
          </div>
          <div className={inputStyles.photos}>
            {existingPhotos.map((photo) => <span key={photo.id} className={inputStyles.photoTile}>
              {/* eslint-disable-next-line @next/next/no-img-element -- address signed by the storage and valid for a short time, not for the image optimiser of Next */}
              <img src={photo.url} alt="Ảnh sản phẩm" referrerPolicy="no-referrer" />
              <button type="button" aria-label="Xóa ảnh" title="Xóa ảnh" onClick={() => setRemovedPhotos((current) => [...current, photo.id])}><InterfaceIcon name="close" /></button>
            </span>)}
            {previews.map((url, index) => <span key={url} className={inputStyles.photoTile}>
              {/* eslint-disable-next-line @next/next/no-img-element -- a local preview (blob:) */}
              <img src={url} alt={`Ảnh mới ${index + 1}`} />
              <button type="button" aria-label={`Bỏ ảnh mới ${index + 1}`} title="Bỏ ảnh" onClick={() => setNewPhotos((current) => current.filter((_, at) => at !== index))}><InterfaceIcon name="close" /></button>
            </span>)}
            {existingPhotos.length + newPhotos.length < MAX_PHOTOS && <button type="button" className={inputStyles.photoAdd} onClick={() => fileInput.current?.click()}>+ Ảnh</button>}
            <span className={inputStyles.hint}>Tối đa {MAX_PHOTOS} ảnh JPEG hoặc PNG, mỗi ảnh 2 MB.</span>
            <input ref={fileInput} type="file" multiple className="sr-only" tabIndex={-1} aria-label="Chọn ảnh sản phẩm" accept="image/jpeg,image/png" onChange={(event) => { pickPhotos(event.target.files); event.target.value = ""; }} />
          </div>
        </div>
      </CollapsibleSection>
      <CollapsibleSection title="Đơn vị tính" description="Đơn vị gốc là kg; thêm đơn vị quy đổi (vd. 1 lồng = 25 kg) và mã của từng đơn vị." columns={1} defaultOpen={values.units.length > 0}>
        <ProductUnitFields units={values.units} catalog={unitList} productCode={values.code || nextCode} unitPrice={values.unitPrice} onPriceChange={(unitPrice) => setValues((current) => ({ ...current, unitPrice }))} onChange={(next) => setValues((current) => ({ ...current, units: next }))} onCreate={(rowKey) => setCreating({ kind: "unit", rowKey })} />
      </CollapsibleSection>
      <CollapsibleSection title="Định mức" description="Số kg còn lại tối thiểu và tối đa để cảnh báo." columns={2} defaultOpen={!!values.minKg || !!values.maxKg}>
        <Field label="Định mức tối thiểu (kg)" inputMode="decimal" value={values.minKg} onChange={setNumber("minKg")} />
        <Field label="Định mức tối đa (kg)" inputMode="decimal" value={values.maxKg} onChange={setNumber("maxKg")} />
      </CollapsibleSection>
      <CollapsibleSection title="Mô tả, ghi chú" columns={1} defaultOpen={!!values.description || !!values.note}>
        <Note label="Mô tả" maxLength={2000} value={values.description} onChange={set("description")} />
        <Note label="Ghi chú" maxLength={2000} value={values.note} onChange={set("note")} />
      </CollapsibleSection>
    </fieldset>
    <ErrorNotice error={error ?? (groups.error || units.error ? `Không tải được ${[groups.error && "nhóm sản phẩm", units.error && "đơn vị tính"].filter(Boolean).join(" và ")}. ${groups.error ?? units.error}` : undefined)} />
    <div className={inputStyles.formFoot}>
      <Button className="w-auto" variant="secondary" disabled={pending} onClick={() => void close()}>Bỏ qua</Button>
      {!editing && <Button className="w-auto" variant="secondary" disabled={pending} onClick={() => void submit(true)}>Lưu & Tạo thêm</Button>}
      <Button className="w-auto" isPending={pending} onClick={() => void submit(false)}>Lưu</Button>
    </div>
    {creating?.kind === "group" && <NameDialog title="Tạo nhóm sản phẩm" label="Tên nhóm sản phẩm" maxLength={100} onSave={createGroup} onClose={() => setCreating(undefined)} />}
    {creating?.kind === "unit" && <NameDialog title="Tạo đơn vị tính" label="Tên đơn vị" maxLength={30} onSave={(name) => createUnit(name, creating.rowKey)} onClose={() => setCreating(undefined)} />}
  </div></Dialog>;
}
