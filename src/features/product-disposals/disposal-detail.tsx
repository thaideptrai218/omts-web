"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { InterfaceIcon } from "@/components/ui/interface-icon";
import { DatePickerField } from "@/components/ui/management-screen/date-picker-field";
import { ListStateMessage } from "@/components/ui/management-screen/management-table";
import { useToast } from "@/components/ui/toast-provider";
import { useActionDialog } from "@/components/ui/use-action-dialog";
import issueStyles from "@/features/input-issues/input-issues.module.css";
import { ErrorNotice, Skeleton, useRemote } from "@/features/operations/ui";
import { fmt, nowLocal, viDateTime, vnLocal } from "@/features/purchase-documents/document-parts";
import { DISPOSAL, type DisposalView } from "@/features/products/contracts";
import type { DisposalAccess } from "@/features/products/product-access";
import { LotLink } from "@/features/products/lot-link";
import { productHref } from "@/features/products/product-helpers";
import { disposalRepository, errorText, problemText } from "@/features/products/repository";
import listStyles from "@/features/suppliers-api/suppliers.module.css";
import { DISPOSALS_PATH, DisposalStatus } from "./disposal-parts";

type Header = { disposedAt: string; notes: string };

/** The row opened under the list: header facts, the lines with a search row, notes and totals, then the actions. */
export function DisposalDetailPanel({ id, access, onChanged, onRemoved }: { id: string; access: DisposalAccess; onChanged(): void; onRemoved(): void }) {
  const remote = useRemote(useCallback((signal: AbortSignal) => disposalRepository.detail(id, signal), [id]));
  if (remote.loading) return <div className={listStyles.detail}><Skeleton /></div>;
  if (remote.error || !remote.data) return <ListStateMessage error={remote.error ?? "Không tải được phiếu."} onRetry={remote.reload} retryLabel="Tải lại phiếu" />;
  return <section className={listStyles.detail} aria-label={`Chi tiết ${remote.data.code}`}><Body key={remote.data.rowVersion} disposal={remote.data} access={access} onChanged={() => { remote.reload(); onChanged(); }} onRemoved={onRemoved} /></section>;
}

function Body({ disposal, access, onChanged, onRemoved }: { disposal: DisposalView; access: DisposalAccess; onChanged(): void; onRemoved(): void }) {
  const router = useRouter(), confirmation = useActionDialog(), { notify } = useToast();
  const [error, setError] = useState<string>(), [pending, setPending] = useState(false);
  const [codeTerm, setCodeTerm] = useState(""), [nameTerm, setNameTerm] = useState("");
  const initial: Header = { disposedAt: vnLocal(disposal.disposedAt), notes: disposal.notes ?? "" };
  const [header, setHeader] = useState(initial);
  const draft = disposal.statusId === DISPOSAL.draft, completed = disposal.statusId === DISPOSAL.completed;
  const editable = access.edit && (draft || completed), dirty = header.disposedAt !== initial.disposedAt || header.notes !== initial.notes;
  const shown = disposal.lines.filter((line) => line.productCode.toLowerCase().includes(codeTerm.trim().toLowerCase()) && line.productName.toLowerCase().includes(nameTerm.trim().toLowerCase()));

  async function cancel() {
    const reason = await confirmation.prompt(`Hủy phiếu ${disposal.code}? Số kg đã hủy được cộng lại cho sản phẩm. Nhập lý do hủy.`);
    if (!reason) return;
    setPending(true); setError(undefined);
    const result = await disposalRepository.cancel(disposal.id, reason, disposal.rowVersion);
    setPending(false);
    if (result.status === "success") { notify({ tone: "success", title: `Đã hủy phiếu ${disposal.code}.` }); onChanged(); } else setError(errorText(result));
  }
  async function remove() {
    if (!(await confirmation.confirm(`Xóa phiếu tạm ${disposal.code}?`))) return;
    setPending(true); setError(undefined);
    const result = await disposalRepository.remove(disposal.id);
    setPending(false);
    if (result.status === "success") { notify({ tone: "success", title: `Đã xóa phiếu tạm ${disposal.code}.` }); onRemoved(); } else setError(errorText(result));
  }
  // Saves the header only: the time and the note; the lines go back unchanged.
  async function saveHeader() {
    setPending(true); setError(undefined);
    const result = await disposalRepository.save({
      rowVersion: disposal.rowVersion, code: disposal.code, disposedAt: `${header.disposedAt.slice(0, 16)}:00+07:00`, zoneId: disposal.zoneId, reason: disposal.reason ?? null, notes: header.notes.trim() || null,
      lines: disposal.lines.map((line) => ({ productId: line.productId, harvestLotId: line.harvestLotId, kg: line.kg, note: line.note ?? null })),
    }, disposal.id);
    setPending(false);
    if (result.status === "success") { notify({ tone: "success", title: `Đã lưu phiếu ${disposal.code}.` }); onChanged(); } else setError(problemText(result));
  }

  return <div className={listStyles.tabBody}>{confirmation.dialog}
    <header className={issueStyles.head}><div><h3>{disposal.code}</h3><DisposalStatus statusId={disposal.statusId} /></div></header>
    <div className={issueStyles.headFacts}>
      <div><span>Người tạo:</span><strong>{disposal.createdBy ?? "—"}</strong></div>
      <div><span>Thời gian:</span>{editable ? <DatePickerField label="Thời gian" withTime value={header.disposedAt} max={nowLocal()} onChange={(disposedAt) => setHeader((current) => ({ ...current, disposedAt }))} />
        : <strong>{viDateTime(disposal.disposedAt)}</strong>}</div>
      <div><span>Vùng:</span><strong>{disposal.zoneCode}</strong></div>
      <div><span>Lý do:</span><strong>{disposal.reason ?? "—"}</strong></div>
      {disposal.statusId === DISPOSAL.cancelled && <>
        <div><span>Hủy lúc:</span><strong>{disposal.cancelledAt ? viDateTime(disposal.cancelledAt) : "—"}</strong></div>
        <div><span>Lý do hủy:</span><span className={issueStyles.danger}>{disposal.cancelReason ?? "—"}</span></div>
      </>}
    </div>
    <div className={issueStyles.innerScroll}><table className={issueStyles.inner}><thead><tr><th>Mã sản phẩm</th><th>Tên sản phẩm</th><th>Lô thu hoạch</th><th className={issueStyles.num}>Số kg hủy</th></tr></thead>
      <tbody>
        <tr className={issueStyles.lineSearch}><td style={{ width: 140 }}><input type="search" aria-label="Tìm mã sản phẩm" placeholder="Tìm mã" value={codeTerm} onChange={(event) => setCodeTerm(event.target.value)} /></td><td><input type="search" aria-label="Tìm tên sản phẩm" placeholder="Tìm tên sản phẩm" value={nameTerm} onChange={(event) => setNameTerm(event.target.value)} /></td><td colSpan={2} /></tr>
        {shown.map((line) => <tr key={line.id}>
          <td><Link className={issueStyles.link} href={productHref(line.productCode)}>{line.productCode}</Link></td>
          <td>{line.productName}{line.note && <span className={issueStyles.sub}>{line.note}</span>}</td>
          <td><LotLink className={issueStyles.link} code={line.lotCode} /></td>
          <td className={issueStyles.num}><strong>{fmt(line.kg)}</strong></td></tr>)}
        {!shown.length && <tr><td colSpan={4} className={issueStyles.empty}>{disposal.lines.length ? "Không có dòng hàng phù hợp." : "Phiếu chưa có hàng."}</td></tr>}
      </tbody></table></div>
    <div className={issueStyles.foot}>
      <textarea className={issueStyles.noteEdit} aria-label="Ghi chú" placeholder="Ghi chú..." readOnly={!editable} maxLength={1000} value={header.notes} onChange={(event) => setHeader((current) => ({ ...current, notes: event.target.value }))} />
      <div className={issueStyles.sums}>
        <div><span>Số dòng</span><span>{disposal.lines.length}</span></div>
        <div className={issueStyles.strong}><span>Tổng số kg hủy</span><span>{fmt(disposal.totalKg)}</span></div>
        {disposal.completedAt && <div><span>Hoàn thành lúc</span><span>{viDateTime(disposal.completedAt)}</span></div>}
      </div>
    </div>
    <ErrorNotice error={error} />
    <footer className={listStyles.tabFooter}>
      <div>
        {draft && access.remove && <Button className="w-auto" variant="ghost" isPending={pending} onClick={() => void remove()}><InterfaceIcon name="trash" className="size-4" />Xóa phiếu tạm</Button>}
        {completed && access.remove && <Button className="w-auto" variant="ghost" isPending={pending} onClick={() => void cancel()}><InterfaceIcon name="trash" className="size-4" />Hủy</Button>}
        {!draft && access.create && <Button className="w-auto" variant="ghost" disabled={pending} onClick={() => router.push(`${DISPOSALS_PATH}/new?copy=${disposal.id}`)}><InterfaceIcon name="document" className="size-4" />Sao chép</Button>}
      </div>
      <div>
        {editable && <Button className="w-auto" disabled={pending} onClick={() => router.push(`${DISPOSALS_PATH}/${disposal.id}/edit`)}><InterfaceIcon name="pencil" className="size-4" />Mở phiếu</Button>}
        {editable && <Button className="w-auto" variant="secondary" isPending={pending} disabled={!dirty} onClick={() => void saveHeader()}><InterfaceIcon name="check" className="size-4" />Lưu</Button>}
      </div>
    </footer>
  </div>;
}
