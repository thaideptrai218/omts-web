"use client";
import { useCallback, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { InterfaceIcon } from "@/components/ui/interface-icon";
import { StatusPill } from "@/components/ui/management-page";
import { ListStateMessage, Subtabs } from "@/components/ui/management-screen/management-table";
import { useToast } from "@/components/ui/toast-provider";
import { useActionDialog } from "@/components/ui/use-action-dialog";
import inputStyles from "@/features/input-items/input-items.module.css";
import { ErrorNotice, Skeleton, useRemote } from "@/features/operations/ui";
import { fmt, viDateTime } from "@/features/purchase-documents/document-parts";
import listStyles from "@/features/suppliers-api/suppliers.module.css";
import { DISCONTINUED, type ProductUnit, type ProductView } from "./contracts";
import { inUnitQuantity, unitSalePrice } from "./product-helpers";
import { ProductLotsTab, ProductMovementsTab, ProductPriceHistoryTab } from "./product-tabs";
import { errorText, productRepository } from "./repository";

export type ProductAccess = { owner: boolean };
type Tab = "info" | "description" | "movements" | "lots" | "prices";
const tabs = [{ key: "info" as const, label: "Thông tin" }, { key: "description" as const, label: "Mô tả, ghi chú" }, { key: "movements" as const, label: "Nhập – xuất" },
  { key: "lots" as const, label: "Lô thu hoạch" }, { key: "prices" as const, label: "Lịch sử giá" }];

/** `unit` is the unit picked under the name on the list: the row then shows that unit alone (its code, price and quantity), not the unit list. */
export function ProductDetailPanel({ id, unit, access, onEdit, onChanged, onRemoved }: { id: string; unit?: ProductUnit; access: ProductAccess; onEdit(record: ProductView, copy: boolean): void; onChanged(): void; onRemoved(): void }) {
  const remote = useRemote(useCallback((signal: AbortSignal) => productRepository.detail(id, signal), [id]));
  const [tab, setTab] = useState<Tab>("info");
  const record = remote.data;
  if (remote.loading) return <section className={listStyles.detail}><Skeleton /></section>;
  if (remote.error || !record) return <section className={listStyles.detail}><ListStateMessage error={remote.error ?? "Không tải được sản phẩm."} onRetry={remote.reload} retryLabel="Tải lại" /></section>;
  const changed = () => { remote.reload(); onChanged(); };
  const props = { record, unit, access, onEdit, onChanged: changed, onRemoved };
  return <section className={listStyles.detail} aria-label={`Chi tiết ${record.code}`}>
    <Subtabs<Tab> label="Nội dung sản phẩm" tabs={tabs} value={tab} onChange={setTab} />
    {tab === "info" && <InfoTab {...props} />}
    {tab === "description" && <DescriptionTab {...props} />}
    {tab === "movements" && <ProductMovementsTab productId={id} note={unit && !unit.isBase && record.onHandKg != null ? <>Lưu ý: Nhập – xuất được tính theo đơn vị cơ bản (kg); còn lại tương ứng với đơn vị ({unit.name}) là: <strong>{fmt(inUnitQuantity(record.onHandKg, unit.factor))}</strong></> : undefined} />}
    {tab === "lots" && <ProductLotsTab productId={id} />}
    {tab === "prices" && <ProductPriceHistoryTab productId={id} unit={unit} />}
  </section>;
}

type TabProps = { record: ProductView; unit?: ProductUnit; access: ProductAccess; onEdit(record: ProductView, copy: boolean): void; onChanged(): void; onRemoved(): void };

function InfoTab(props: TabProps) {
  const { record } = props, [shown, setShown] = useState(0);
  const discontinued = record.statusId === DISCONTINUED, photos = record.photos ?? [];
  const initials = record.name.split(/\s+/).filter(Boolean).slice(-2).map((part) => part[0]).join("").toUpperCase();
  const kg = (value: number | null | undefined) => value == null ? "—" : `${fmt(value)} kg`;
  const inUnit = (value: number | null | undefined) => value == null || !props.unit ? "—" : `${fmt(inUnitQuantity(value, props.unit.factor))} ${props.unit.name}`;
  // With a unit picked on the list only that unit shows (its code, price and quantity); otherwise the whole unit list.
  const facts: [string, ReactNode][] = props.unit ? [
    ["Mã sản phẩm", props.unit.code], ["Tên sản phẩm", record.name], ["Nhóm sản phẩm", record.categoryName], ["Đơn vị tính", props.unit.name],
    ["Giá bán", record.unitPrice == null ? null : `${fmt(unitSalePrice(record.unitPrice, props.unit))} đồng/${props.unit.name}`], ["Còn lại", inUnit(record.onHandKg)],
    ["Định mức tối thiểu", inUnit(record.minKg)], ["Định mức tối đa", inUnit(record.maxKg)], ["Người tạo", record.createdBy], ["Ngày tạo", viDateTime(record.createdAt)],
  ] : [
    ["Mã sản phẩm", record.code], ["Tên sản phẩm", record.name], ["Nhóm sản phẩm", record.categoryName],
    ["Đơn vị tính", <span key="units" className={inputStyles.unitList}>{record.units.map((unit) => <span key={unit.id}>{unit.isBase ? unit.name : `${unit.name} = ${fmt(unit.factor)} kg`} <small>· {unit.code}</small></span>)}</span>],
    ["Giá bán", record.unitPrice == null ? null : `${fmt(record.unitPrice)} đồng/kg`], ["Còn lại", kg(record.onHandKg)],
    ["Định mức tối thiểu", kg(record.minKg)], ["Định mức tối đa", kg(record.maxKg)], ["Người tạo", record.createdBy], ["Ngày tạo", viDateTime(record.createdAt)],
  ];
  return <div className={listStyles.tabBody}>
    <header className={inputStyles.infoHead}><h3>{record.name}{props.unit ? ` - ${props.unit.name}` : ""}</h3><StatusPill tone={discontinued ? "neutral" : "success"}>{discontinued ? "Ngừng bán" : "Đang bán"}</StatusPill></header>
    <div className={inputStyles.infoBody}>
      <div className={inputStyles.gallery}>
        <span className={inputStyles.photoMain}>{photos[shown] ? (
          // eslint-disable-next-line @next/next/no-img-element -- address signed by the storage and valid for a short time, not for the image optimiser of Next
          <img src={photos[shown].url} alt={`Ảnh ${record.name}`} referrerPolicy="no-referrer" />
        ) : initials}</span>
        {photos.length > 1 && <span className={inputStyles.thumbs}>{photos.map((photo, index) => <button key={photo.id} type="button" aria-label={`Xem ảnh ${index + 1}`} aria-current={index === shown} onClick={() => setShown(index)}>
          {/* eslint-disable-next-line @next/next/no-img-element -- address signed by the storage */}
          <img src={photo.url} alt="" referrerPolicy="no-referrer" /></button>)}</span>}
      </div>
      <dl className={listStyles.facts}>{facts.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value || "—"}</dd></div>)}</dl>
    </div>
    <ProductActions {...props} />
  </div>;
}

function DescriptionTab(props: TabProps) {
  const { record } = props;
  return <div className={listStyles.tabBody}>
    <div className={inputStyles.textBlock}>
      <h4>Mô tả</h4><p>{record.description || "—"}</p>
      <h4>Ghi chú</h4><p>{record.note || "—"}</p>
    </div>
    <ProductActions {...props} />
  </div>;
}

/** Xóa · Sao chép on the left; Chỉnh sửa · Ngừng bán on the right. Writing the catalogue is the Owner's. */
function ProductActions({ record, access, onEdit, onChanged, onRemoved }: TabProps) {
  const confirmation = useActionDialog(), { notify } = useToast();
  const [error, setError] = useState<string>(), [pending, setPending] = useState(false);
  const discontinued = record.statusId === DISCONTINUED;
  async function toggle() {
    if (pending || !(await confirmation.confirm(discontinued ? `Cho bán lại ${record.name}?` : `Ngừng bán ${record.name}? Chứng từ đã có không thay đổi; sản phẩm không còn được chọn khi lập hóa đơn hay thu hoạch mới.`))) return;
    setPending(true); setError(undefined);
    const result = await productRepository.setStatus(discontinued ? "resume" : "discontinue", record.id);
    setPending(false);
    if (result.status === "success") { notify({ tone: "success", title: discontinued ? `Đã cho bán lại ${record.code}.` : `Đã ngừng bán ${record.code}.` }); onChanged(); } else setError(errorText(result));
  }
  async function remove() {
    if (pending || !(await confirmation.confirm(`Xóa sản phẩm ${record.name} (${record.code})? Sản phẩm đã có chứng từ sẽ được ẩn khỏi mọi danh sách, mã và tên vẫn được giữ.`))) return;
    setPending(true); setError(undefined);
    const result = await productRepository.remove(record.id);
    setPending(false);
    if (result.status !== "success") { setError(errorText(result)); return; }
    notify({ tone: "success", title: `Đã xóa sản phẩm ${record.code}.`, description: result.data.removed ? undefined : "Sản phẩm đã có chứng từ nên chỉ bị ẩn." });
    onRemoved();
  }
  if (!access.owner) return null;
  return <><ErrorNotice error={error} />{confirmation.dialog}<footer className={listStyles.tabFooter}>
    <div>
      <Button className="w-auto" variant="ghost" isPending={pending} onClick={() => void remove()}><InterfaceIcon name="trash" className="size-4" />Xóa</Button>
      <Button className="w-auto" variant="ghost" disabled={pending} onClick={() => onEdit(record, true)}><InterfaceIcon name="document" className="size-4" />Sao chép</Button>
    </div>
    <div>
      {!discontinued && <Button className="w-auto" disabled={pending} onClick={() => onEdit(record, false)}><InterfaceIcon name="pencil" className="size-4" />Chỉnh sửa</Button>}
      <Button className="w-auto" variant="secondary" disabled={pending} onClick={() => void toggle()}><InterfaceIcon name="lock" className="size-4" />{discontinued ? "Cho bán lại" : "Ngừng bán"}</Button>
    </div>
  </footer></>;
}
