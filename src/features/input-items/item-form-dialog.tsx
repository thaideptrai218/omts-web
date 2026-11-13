"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { InterfaceIcon } from "@/components/ui/interface-icon";
import { CollapsibleSection, Subtabs, managementStyles } from "@/components/ui/management-screen/management-table";
import { SelectBox } from "@/components/ui/select-box";
import { useToast } from "@/components/ui/toast-provider";
import { useActionDialog } from "@/components/ui/use-action-dialog";
import { ErrorNotice, Field, Note, Select, control, useRemote } from "@/features/operations/ui";
import { itemTypes, type InputGroup, type InputUnit, type ItemView } from "./contracts";
import { MAX_PHOTOS, buildSaveBody, groupLabel, groupTree, initialValues, validateForm, type FormValues } from "./item-helpers";
import { NameDialog, UnitFields } from "./item-unit-fields";
import { errorText, inputRepository, problemText } from "./repository";
import styles from "./input-items.module.css";

type Tab = "info" | "description";
const photoTypes = ["image/jpeg", "image/png"], maxPhoto = 2 * 1024 * 1024;
const decimalOnly = (value: string) => value.replace(/[^\d.,]/g, "");

/**
 * "+ Tạo mới", "Sao chép" and "Chỉnh sửa": one form for the item. A copy starts from the record without its code, photos or unit codes.
 * `onSaved(saved, again)` runs after every save; with `again` the form stays open, emptied, for the next item.
 */
export function ItemFormDialog({ record, copy, onClose, onSaved }: { record: ItemView | null; copy: boolean; onClose(): void; onSaved(saved: ItemView, again: boolean): void }) {
  const editing = record !== null && !copy, confirmation = useActionDialog(), { notify } = useToast(), fileInput = useRef<HTMLInputElement>(null);
  const [initial] = useState(() => initialValues(record, copy));
  const [values, setValues] = useState<FormValues>(initial), [tab, setTab] = useState<Tab>("info"), [pending, setPending] = useState(false), [error, setError] = useState<string>();
  const [newPhotos, setNewPhotos] = useState<File[]>([]), [removedPhotos, setRemovedPhotos] = useState<string[]>([]);
  const [nextCode, setNextCode] = useState(""), [extraGroups, setExtraGroups] = useState<InputGroup[]>([]), [extraUnits, setExtraUnits] = useState<InputUnit[]>([]);
  const [creating, setCreating] = useState<{ kind: "group" } | { kind: "unit"; rowKey: string }>();
  const groups = useRemote(useCallback((signal: AbortSignal) => inputRepository.groups(signal), []));
  const units = useRemote(useCallback((signal: AbortSignal) => inputRepository.units(signal), []));
  const groupList = useMemo(() => [...(groups.data ?? []), ...extraGroups.filter((extra) => !groups.data?.some((row) => row.id === extra.id))], [groups.data, extraGroups]);
  const unitList = useMemo(() => [...(units.data ?? []), ...extraUnits.filter((extra) => !units.data?.some((row) => row.id === extra.id))], [units.data, extraUnits]);
  // "Loại hàu bán ra" belongs to seed items: the products in use are read once per dialog, when the item is (or becomes) a Seed; the one already linked stays selectable.
  const isSeed = values.group === "Seed";
  const products = useRemote(useCallback((signal: AbortSignal) => isSeed ? inputRepository.products(signal) : Promise.resolve({ status: "success" as const, data: [] }), [isSeed]));
  const linkedId = record?.productId, linkedName = record?.productName;
  const productList = useMemo(() => [...(products.data ?? []), ...(linkedId && !products.data?.some((row) => row.id === linkedId) ? [{ id: linkedId, name: linkedName || "Loại hàu hiện tại" }] : [])], [products.data, linkedId, linkedName]);
  const existingPhotos = (editing ? record.photos ?? [] : []).filter((photo) => !removedPhotos.includes(photo.id));
  const previews = useMemo(() => newPhotos.map((file) => URL.createObjectURL(file)), [newPhotos]);
  useEffect(() => () => previews.forEach((url) => URL.revokeObjectURL(url)), [previews]);

  // The code a new item of this type would get, shown as the placeholder of the code box; typing a code overrides it.
  useEffect(() => {
    if (editing) return;
    const controller = new AbortController();
    void inputRepository.nextCode(values.group, controller.signal).then((result) => { if (!controller.signal.aborted && result.status === "success") setNextCode(result.data.code); });
    return () => controller.abort();
  }, [editing, values.group]);

  const set = (key: keyof FormValues) => (event: { target: { value: string } }) => setValues((current) => ({ ...current, [key]: event.target.value }));
  const setNumber = (key: "minQuantity" | "maxQuantity" | "costPrice" | "openingQuantity") => (event: { target: { value: string } }) => setValues((current) => ({ ...current, [key]: decimalOnly(event.target.value) }));
  const dirty = JSON.stringify(values) !== JSON.stringify(initial) || newPhotos.length > 0 || removedPhotos.length > 0;
  const close = async () => { if (!pending && (!dirty || await confirmation.confirm("Bỏ các thay đổi chưa lưu?"))) onClose(); };
  const baseLocked = editing && record.hasMovements === true;

  function pickPhotos(files: FileList | null) {
    const room = MAX_PHOTOS - existingPhotos.length - newPhotos.length, accepted: File[] = [];
    for (const file of Array.from(files ?? [])) {
      if (!photoTypes.includes(file.type)) { setError("Ảnh phải là JPEG hoặc PNG."); return; }
      if (file.size > maxPhoto) { setError("Mỗi ảnh tối đa 2 MB."); return; }
      accepted.push(file);
    }
    if (accepted.length > room) { setError(`Tối đa ${MAX_PHOTOS} ảnh cho một vật tư.`); return; }
    setError(undefined); setNewPhotos((current) => [...current, ...accepted]);
  }

  async function submit(again: boolean) {
    if (pending) return;
    const problem = validateForm(values);
    if (problem) { setError(problem); return; }
    setPending(true); setError(undefined);
    const result = await inputRepository.save(buildSaveBody(values, editing ? record : null), editing ? record.id : undefined);
    if (result.status !== "success") { setPending(false); setError(problemText(result)); return; }
    // The photos have their own calls; the item is already saved, so a failed photo is told after the form has moved on.
    let saved = result.data, photoFailure: string | undefined;
    for (const photoId of removedPhotos) { const done = await inputRepository.removePhoto(saved.id, photoId); if (done.status === "success") saved = done.data; else photoFailure ??= errorText(done); }
    for (const file of newPhotos) { const done = await inputRepository.addPhoto(saved.id, file); if (done.status === "success") saved = done.data; else photoFailure ??= errorText(done); }
    setPending(false);
    if (photoFailure) notify({ tone: "danger", title: `Đã lưu ${saved.code} nhưng chưa cập nhật được ảnh.`, description: photoFailure });
    onSaved(saved, again);
    if (again) { setValues({ ...initialValues(null, false), group: values.group, itemGroupId: values.itemGroupId }); setNewPhotos([]); setRemovedPhotos([]); setTab("info"); }
  }

  async function createGroup(name: string) {
    const result = await inputRepository.saveGroup(name);
    if (result.status !== "success") return problemText(result);
    setExtraGroups((current) => [...current, result.data]); setValues((current) => ({ ...current, itemGroupId: result.data.id }));
    notify({ tone: "success", title: `Đã tạo nhóm hàng ${result.data.name}.` }); setCreating(undefined);
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

  const title = editing ? `Sửa vật tư ${record.code}` : copy ? "Sao chép vật tư" : "Tạo vật tư";
  const tabs = [{ key: "info" as const, label: "Thông tin" }, { key: "description" as const, label: "Mô tả" }];
  return <Dialog open size="xl" title={title} dismissible={!pending} onOpenChange={(open) => { if (!open) void close(); }}><div className={managementStyles.theme}>
    {confirmation.dialog}
    <div className={styles.formTabs}><Subtabs<Tab> label="Nội dung vật tư" tabs={tabs} value={tab} onChange={setTab} /></div>
    <fieldset disabled={pending} className="min-w-0">
      {tab === "info" ? <>
      {/* Identity on the left, photos on the right; then one bordered, foldable section per topic. */}
      <div className={styles.identity}>
        <div className={styles.identityFields}>
          <Field label="Mã hàng" maxLength={30} placeholder={nextCode || "Mã tự động"} title="Để trống để hệ thống tự cấp mã theo loại hàng" value={values.code} onChange={(event) => setValues((current) => ({ ...current, code: event.target.value.replace(/\s/g, "") }))} />
          <Select label="Loại hàng" disabled={editing && record.isUsed === true} value={values.group} onChange={set("group")}>{itemTypes.map(([key, label]) => <option key={key} value={key}>{label}</option>)}</Select>
          <div className={styles.wide}><Field label="Tên hàng *" required maxLength={200} placeholder="Bắt buộc" value={values.name} onChange={set("name")} /></div>
          <label className={`${styles.wide} block text-xs font-medium text-text-muted`}>
            <span className={styles.labelRow}>Nhóm hàng<button type="button" className={managementStyles.linkButton} onClick={() => setCreating({ kind: "group" })}>Tạo mới</button></span>
            <SelectBox aria-label="Nhóm hàng" className={control} value={values.itemGroupId} onChange={set("itemGroupId")}><option value="">Chưa chọn</option>{groupTree(groupList).map((group) => <option key={group.id} value={group.id}>{groupLabel(group)}</option>)}</SelectBox>
          </label>
          {isSeed && <div className={styles.wide}>
            <Select label="Loại hàu bán ra" disabled={products.loading} value={values.productId} onChange={set("productId")}>
              <option value="">{products.loading ? "Đang tải..." : "Chưa chọn"}</option>{productList.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}</Select>
            <p className={styles.hint}>Chọn loại hàu mà giống này nuôi ra. Đơn mua của khách phải khớp loại hàu này khi thu hoạch.</p>
            {products.error && <p role="alert" className="mt-1 text-xs text-danger">Không tải được danh sách loại hàu. {products.error} <button type="button" className={managementStyles.linkButton} onClick={products.reload}>Tải lại</button></p>}
          </div>}
        </div>
        <div className={styles.photos}>
          {existingPhotos.map((photo) => <span key={photo.id} className={styles.photoTile}>
            {/* eslint-disable-next-line @next/next/no-img-element -- address signed by the storage and valid for a short time, not for the image optimiser of Next */}
            <img src={photo.url} alt="Ảnh vật tư" referrerPolicy="no-referrer" />
            <button type="button" aria-label="Xóa ảnh" title="Xóa ảnh" onClick={() => setRemovedPhotos((current) => [...current, photo.id])}><InterfaceIcon name="close" /></button>
          </span>)}
          {previews.map((url, index) => <span key={url} className={styles.photoTile}>
            {/* eslint-disable-next-line @next/next/no-img-element -- a local preview (blob:) */}
            <img src={url} alt={`Ảnh mới ${index + 1}`} />
            <button type="button" aria-label={`Bỏ ảnh mới ${index + 1}`} title="Bỏ ảnh" onClick={() => setNewPhotos((current) => current.filter((_, at) => at !== index))}><InterfaceIcon name="close" /></button>
          </span>)}
          {existingPhotos.length + newPhotos.length < MAX_PHOTOS && <button type="button" className={styles.photoAdd} onClick={() => fileInput.current?.click()}>+ Ảnh</button>}
          <span className={styles.hint}>Tối đa {MAX_PHOTOS} ảnh JPEG hoặc PNG, mỗi ảnh 2 MB.</span>
          <input ref={fileInput} type="file" multiple className="sr-only" tabIndex={-1} aria-label="Chọn ảnh vật tư" accept="image/jpeg,image/png" onChange={(event) => { pickPhotos(event.target.files); event.target.value = ""; }} />
        </div>
      </div>
      <CollapsibleSection title="Số lượng và định mức" description="Số còn lại khi bắt đầu dùng hệ thống, và mức tối thiểu/tối đa để cảnh báo." columns={3}>
        <div>
          <Field label="Còn lại ban đầu" inputMode="decimal" value={values.openingQuantity} onChange={setNumber("openingQuantity")} />
          {editing && <p className={styles.hint}>Chỉ sửa được khi vật tư chưa có phát sinh nào khác.</p>}
        </div>
        <Field label="Định mức tối thiểu" inputMode="decimal" value={values.minQuantity} onChange={setNumber("minQuantity")} />
        <Field label="Định mức tối đa" inputMode="decimal" value={values.maxQuantity} onChange={setNumber("maxQuantity")} />
      </CollapsibleSection>
      <CollapsibleSection title="Quy cách và giá vốn" description="Đơn vị cơ bản, các đơn vị quy đổi (vd. 1 thùng = 10 cái), mã và giá vốn của từng đơn vị." columns={1}>
        <UnitFields units={values.units} catalog={unitList} itemCode={values.code || nextCode} baseLocked={baseLocked} costPrice={values.costPrice}
          onChange={(next) => setValues((current) => ({ ...current, units: next }))} onCostChange={(costPrice) => setValues((current) => ({ ...current, costPrice }))} onCreate={(rowKey) => setCreating({ kind: "unit", rowKey })} />
      </CollapsibleSection>
      </> : <div className={styles.formGrid}>
        <div className={styles.wide}><Note label="Mô tả" maxLength={2000} value={values.description} onChange={set("description")} /></div>
        <div className={styles.wide}><Note label="Ghi chú" maxLength={2000} value={values.notes} onChange={set("notes")} /></div>
      </div>}
    </fieldset>
    <ErrorNotice error={error ?? (groups.error || units.error ? `Không tải được ${[groups.error && "nhóm hàng", units.error && "đơn vị tính"].filter(Boolean).join(" và ")}. ${groups.error ?? units.error}` : undefined)} />
    <div className={styles.formFoot}>
      <Button className="w-auto" variant="secondary" disabled={pending} onClick={() => void close()}>Bỏ qua</Button>
      {!editing && <Button className="w-auto" variant="secondary" disabled={pending} onClick={() => void submit(true)}>Lưu & Tạo thêm</Button>}
      <Button className="w-auto" isPending={pending} onClick={() => void submit(false)}>Lưu</Button>
    </div>
    {creating?.kind === "group" && <NameDialog title="Tạo nhóm hàng" label="Tên nhóm hàng" maxLength={100} onSave={createGroup} onClose={() => setCreating(undefined)} />}
    {creating?.kind === "unit" && <NameDialog title="Tạo đơn vị tính" label="Tên đơn vị" maxLength={30} onSave={(name) => createUnit(name, creating.rowKey)} onClose={() => setCreating(undefined)} />}
  </div></Dialog>;
}
