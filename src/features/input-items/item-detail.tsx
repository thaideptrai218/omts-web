"use client";
import { useRouter } from "next/navigation";
import { useCallback, useMemo, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { InterfaceIcon } from "@/components/ui/interface-icon";
import { StatusPill } from "@/components/ui/management-page";
import { ListStateMessage, Subtabs } from "@/components/ui/management-screen/management-table";
import { useToast } from "@/components/ui/toast-provider";
import { useActionDialog } from "@/components/ui/use-action-dialog";
import { ErrorNotice, Skeleton, useRemote } from "@/features/operations/ui";
import { fmt, viDateTime } from "@/features/purchase-documents/document-parts";
import listStyles from "@/features/suppliers-api/suppliers.module.css";
import { DISCONTINUED, typeLabel, type ItemView, type UnitView } from "./contracts";
import { baseUnitOf, inUnitPrice, inUnitQuantity } from "./item-helpers";
import { ItemLotsTab } from "./item-lots-tab";
import { ItemMovementsTab } from "./item-movements-tab";
import { errorText, inputRepository } from "./repository";
import styles from "./input-items.module.css";

export type ItemAccess = { owner: boolean; receive: boolean; issue: boolean; exportFile: boolean };
type Tab = "info" | "description" | "movements" | "lots";

/** `unit` is the unit picked under the name on the list: the row then shows that unit alone (its code, cost and quantity), not the unit list. */
export function ItemDetailPanel({ id, unit, access, onEdit, onChanged, onRemoved }: { id: string; unit?: UnitView; access: ItemAccess; onEdit(record: ItemView, copy: boolean): void; onChanged(): void; onRemoved(): void }) {
  const remote = useRemote(useCallback((signal: AbortSignal) => inputRepository.detail(id, signal), [id]));
  const [tab, setTab] = useState<Tab>("info");
  const record = remote.data;
  const tabs = useMemo(() => [{ key: "info" as const, label: "Thông tin" }, { key: "description" as const, label: "Mô tả, ghi chú" }, { key: "movements" as const, label: "Nhập – xuất" },
    ...(record?.group === "Seed" ? [{ key: "lots" as const, label: "Lô giống" }] : [])], [record?.group]);
  if (remote.loading) return <section className={listStyles.detail}><Skeleton /></section>;
  if (remote.error || !record) return <section className={listStyles.detail}><ListStateMessage error={remote.error ?? "Không tải được vật tư."} onRetry={remote.reload} retryLabel="Tải lại" /></section>;
  const changed = () => { remote.reload(); onChanged(); };
  return <section className={listStyles.detail} aria-label={`Chi tiết ${record.code}`}>
    <Subtabs<Tab> label="Nội dung vật tư" tabs={tabs} value={tab} onChange={setTab} />
    {tab === "info" && <InfoTab record={record} unit={unit} access={access} onEdit={onEdit} onChanged={changed} onRemoved={onRemoved} />}
    {tab === "description" && <DescriptionTab record={record} access={access} onEdit={onEdit} onChanged={changed} onRemoved={onRemoved} />}
    {tab === "movements" && <ItemMovementsTab itemId={id} canExport={access.exportFile} note={unit && !unit.isBase ? <>Lưu ý: Nhập – xuất được tính theo đơn vị cơ bản ({baseUnitOf(record.units)?.name ?? record.unit}); còn lại tương ứng với đơn vị ({unit.name}) là: <strong>{fmt(inUnitQuantity(record.onHand, unit.factor))}</strong></> : undefined} />}
    {tab === "lots" && <ItemLotsTab itemId={id} canDelete={access.owner} onChanged={onChanged} />}
  </section>;
}

type TabProps = { record: ItemView; unit?: UnitView; access: ItemAccess; onEdit(record: ItemView, copy: boolean): void; onChanged(): void; onRemoved(): void };

function InfoTab(props: TabProps) {
  const { record } = props, [shown, setShown] = useState(0);
  const base = baseUnitOf(record.units), discontinued = record.statusId === DISCONTINUED, photos = record.photos ?? [];
  const initials = record.name.split(/\s+/).filter(Boolean).slice(-2).map((part) => part[0]).join("").toUpperCase();
  const quantity = (value: number | null | undefined) => value == null ? "—" : `${fmt(value)} ${base?.name ?? ""}`;
  const inUnit = props.unit;
  const unitQuantity = (value: number | null | undefined) => value == null || !inUnit ? "—" : `${fmt(inUnitQuantity(value, inUnit.factor))} ${inUnit.name}`;
  const unitPrice = (value: number | null | undefined) => value == null || !inUnit ? null : `${fmt(inUnitPrice(value, inUnit.factor))} / ${inUnit.name}`;
  // With a unit picked on the list only that unit shows (its code, cost and quantity); otherwise the whole unit list.
  const facts: [string, ReactNode][] = inUnit ? [
    ["Mã hàng", inUnit.code], ["Tên hàng", record.name], ["Loại hàng", typeLabel(record.group)], ["Nhóm hàng", record.itemGroupName], ["Đơn vị tính", inUnit.name],
    ["Giá vốn", unitPrice(record.costPrice)], ["Giá nhập cuối", unitPrice(record.lastPurchasePrice)],
    ["Còn lại", unitQuantity(record.onHand)], ["Giá trị còn lại", fmt(record.stockValue)], ["Định mức tối thiểu", unitQuantity(record.minQuantity)], ["Định mức tối đa", unitQuantity(record.maxQuantity)],
    ["Người tạo", record.createdBy], ["Ngày tạo", viDateTime(record.createdAt)],
  ] : [
    ["Mã hàng", record.code], ["Tên hàng", record.name], ["Loại hàng", typeLabel(record.group)], ["Nhóm hàng", record.itemGroupName],
    ["Đơn vị tính", <span key="units" className={styles.unitList}>{record.units.map((unit) => <span key={unit.id}>{unit.name} <small>· {unit.code}</small></span>)}</span>],
    ["Giá vốn", record.costPrice == null ? null : `${fmt(record.costPrice)} / ${base?.name ?? ""}`], ["Giá nhập cuối", record.lastPurchasePrice == null ? null : `${fmt(record.lastPurchasePrice)} / ${base?.name ?? ""}`],
    ["Còn lại", quantity(record.onHand)], ["Giá trị còn lại", fmt(record.stockValue)], ["Định mức tối thiểu", quantity(record.minQuantity)], ["Định mức tối đa", quantity(record.maxQuantity)],
    ["Người tạo", record.createdBy], ["Ngày tạo", viDateTime(record.createdAt)],
  ];
  return <div className={listStyles.tabBody}>
    <header className={styles.infoHead}><h3>{record.name}{inUnit ? ` - ${inUnit.name}` : ""}</h3><StatusPill tone={discontinued ? "neutral" : "success"}>{discontinued ? "Ngừng sử dụng" : "Đang sử dụng"}</StatusPill></header>
    <div className={styles.infoBody}>
      <div className={styles.gallery}>
        <span className={styles.photoMain}>{photos[shown] ? (
          // eslint-disable-next-line @next/next/no-img-element -- address signed by the storage and valid for a short time, not for the image optimiser of Next
          <img src={photos[shown].url} alt={`Ảnh ${record.name}`} referrerPolicy="no-referrer" />
        ) : initials}</span>
        {photos.length > 1 && <span className={styles.thumbs}>{photos.map((photo, index) => <button key={photo.id} type="button" aria-label={`Xem ảnh ${index + 1}`} aria-current={index === shown} onClick={() => setShown(index)}>
          {/* eslint-disable-next-line @next/next/no-img-element -- address signed by the storage */}
          <img src={photo.url} alt="" referrerPolicy="no-referrer" /></button>)}</span>}
      </div>
      <dl className={listStyles.facts}>{facts.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value || "—"}</dd></div>)}</dl>
    </div>
    <ItemActions {...props} />
  </div>;
}

function DescriptionTab(props: TabProps) {
  const { record } = props;
  return <div className={listStyles.tabBody}>
    <div className={styles.textBlock}>
      <h4>Mô tả</h4><p>{record.description || "—"}</p>
      <h4>Ghi chú</h4><p>{record.notes || "—"}</p>
    </div>
    <ItemActions {...props} />
  </div>;
}

/** Xóa · Sao chép on the left; Chỉnh sửa · Nhập hàng · Ngừng sử dụng on the right. Writing the catalogue is the Owner's. */
function ItemActions({ record, access, onEdit, onChanged, onRemoved }: TabProps) {
  const router = useRouter(), confirmation = useActionDialog(), { notify } = useToast();
  const [error, setError] = useState<string>(), [pending, setPending] = useState(false);
  const discontinued = record.statusId === DISCONTINUED;
  async function toggle() {
    if (pending || !(await confirmation.confirm(discontinued ? `Tiếp tục sử dụng ${record.name}?` : `Ngừng sử dụng ${record.name}? Chứng từ đã có không thay đổi; vật tư không còn được chọn khi lập phiếu mới.`))) return;
    setPending(true); setError(undefined);
    const result = await inputRepository.setStatus(discontinued ? "resume" : "discontinue", record.id);
    setPending(false);
    if (result.status === "success") { notify({ tone: "success", title: discontinued ? `Đã tiếp tục sử dụng ${record.code}.` : `Đã ngừng sử dụng ${record.code}.` }); onChanged(); } else setError(errorText(result));
  }
  async function remove() {
    if (pending || !(await confirmation.confirm(`Xóa vật tư ${record.name} (${record.code})? Số còn lại sẽ được xuất hủy và vật tư không còn hiện trong danh sách; chứng từ cũ vẫn giữ.`))) return;
    setPending(true); setError(undefined);
    const result = await inputRepository.remove(record.id);
    setPending(false);
    if (result.status !== "success") { setError(errorText(result)); return; }
    const left = result.data.disposedQuantity ?? 0;
    notify({ tone: "success", title: `Đã xóa vật tư ${record.code}.`, description: result.data.disposalCode && left > 0 ? `Số còn lại ${fmt(left)} ${baseUnitOf(record.units)?.name ?? ""} đã xuất hủy theo phiếu ${result.data.disposalCode}.` : undefined });
    onRemoved();
  }
  const canReceive = access.receive && !discontinued, canIssue = access.issue && !discontinued;
  if (!access.owner && !canReceive && !canIssue) return null;
  return <><ErrorNotice error={error} />{confirmation.dialog}<footer className={listStyles.tabFooter}>
    <div>
      {access.owner && <Button className="w-auto" variant="ghost" isPending={pending} onClick={() => void remove()}><InterfaceIcon name="trash" className="size-4" />Xóa</Button>}
      {access.owner && <Button className="w-auto" variant="ghost" disabled={pending} onClick={() => onEdit(record, true)}><InterfaceIcon name="document" className="size-4" />Sao chép</Button>}
    </div>
    <div>
      {access.owner && !discontinued && <Button className="w-auto" disabled={pending} onClick={() => onEdit(record, false)}><InterfaceIcon name="pencil" className="size-4" />Chỉnh sửa</Button>}
      {canReceive && <Button className="w-auto" variant="secondary" disabled={pending} onClick={() => router.push(`/operations/purchase-receipts/new?item=${record.id}`)}><InterfaceIcon name="receipt" className="size-4" />Nhập hàng</Button>}
      {canIssue && <Button className="w-auto" variant="secondary" disabled={pending} onClick={() => router.push(`/inputs/uses/new?item=${record.id}`)}><InterfaceIcon name="material" className="size-4" />Xuất dùng</Button>}
      {access.owner && <Button className="w-auto" variant="secondary" disabled={pending} onClick={() => void toggle()}><InterfaceIcon name="lock" className="size-4" />{discontinued ? "Tiếp tục sử dụng" : "Ngừng sử dụng"}</Button>}
    </div>
  </footer></>;
}
