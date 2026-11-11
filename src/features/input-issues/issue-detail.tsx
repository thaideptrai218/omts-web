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
import { ErrorNotice, Skeleton, useRemote } from "@/features/operations/ui";
import { fmt, nowLocal, viDateTime, vnLocal } from "@/features/purchase-documents/document-parts";
import styles from "@/features/purchase-documents/purchases.module.css";
import listStyles from "@/features/suppliers-api/suppliers.module.css";
import { ISSUE, type IssueView } from "@/features/input-items/contracts";
import { issueRepository, errorText, problemText } from "@/features/input-items/repository";
import { IssueStatus } from "./issue-dialogs";
import { itemHref, kindInfo, type IssueAccess } from "./issue-access";

type Header = { issuedAt: string; notes: string };

/** The row opened under the list, laid out like a receipt: header facts, the lines with a search row, notes and totals, then the actions. */
export function IssueDetailPanel({ id, access, onChanged, onRemoved }: { id: string; access: IssueAccess; onChanged(): void; onRemoved(): void }) {
  const remote = useRemote(useCallback((signal: AbortSignal) => issueRepository.detail(id, signal), [id]));
  if (remote.loading) return <div className={listStyles.detail}><Skeleton /></div>;
  if (remote.error || !remote.data) return <ListStateMessage error={remote.error ?? "Không tải được phiếu."} onRetry={remote.reload} retryLabel="Tải lại phiếu" />;
  return <section className={listStyles.detail} aria-label={`Chi tiết ${remote.data.code}`}><Body key={remote.data.rowVersion} issue={remote.data} access={access} onChanged={() => { remote.reload(); onChanged(); }} onRemoved={onRemoved} /></section>;
}

function Body({ issue, access, onChanged, onRemoved }: { issue: IssueView; access: IssueAccess; onChanged(): void; onRemoved(): void }) {
  const router = useRouter(), confirmation = useActionDialog(), { notify } = useToast();
  const [error, setError] = useState<string>(), [pending, setPending] = useState(false);
  const [codeTerm, setCodeTerm] = useState(""), [nameTerm, setNameTerm] = useState("");
  const initial: Header = { issuedAt: vnLocal(issue.issuedAt), notes: issue.notes ?? "" };
  const [header, setHeader] = useState(initial);
  const info = kindInfo[issue.kind], use = issue.kind === "Use";
  const draft = issue.statusId === ISSUE.draft, completed = issue.statusId === ISSUE.completed;
  const editable = access.edit && (draft || completed), dirty = header.issuedAt !== initial.issuedAt || header.notes !== initial.notes;
  const quantity = issue.lines.reduce((sum, line) => sum + line.quantity, 0);
  const shown = issue.lines.filter((line) => line.itemCode.toLowerCase().includes(codeTerm.trim().toLowerCase()) && line.itemName.toLowerCase().includes(nameTerm.trim().toLowerCase()));

  async function cancel() {
    const reason = await confirmation.prompt(`Hủy ${info.noun} ${issue.code}? Số lượng đã xuất được cộng lại. Nhập lý do hủy.`);
    if (!reason) return;
    setPending(true); setError(undefined);
    const result = await issueRepository.cancel(issue.id, reason, issue.rowVersion);
    setPending(false);
    if (result.status === "success") { notify({ tone: "success", title: `Đã hủy phiếu ${issue.code}.` }); onChanged(); } else setError(errorText(result));
  }
  async function remove() {
    if (!(await confirmation.confirm(`Xóa phiếu tạm ${issue.code}?`))) return;
    setPending(true); setError(undefined);
    const result = await issueRepository.remove(issue.id);
    setPending(false);
    if (result.status === "success") { notify({ tone: "success", title: `Đã xóa phiếu tạm ${issue.code}.` }); onRemoved(); } else setError(errorText(result));
  }
  // Saves the header only: the time and the note; the lines go back unchanged.
  async function saveHeader() {
    setPending(true); setError(undefined);
    const result = await issueRepository.save({
      rowVersion: issue.rowVersion, code: issue.code, issuedAt: `${header.issuedAt.slice(0, 16)}:00+07:00`, notes: header.notes.trim() || null,
      ...(use ? { zoneId: issue.zoneId ?? null, raftId: issue.raftId ?? null, issueTypeId: issue.issueTypeId ?? null, receiverEmployeeId: issue.receiverEmployeeId ?? null } : { reason: issue.reason ?? null }),
      lines: issue.lines.map((line) => ({ itemId: line.itemId, itemUnitId: line.itemUnitId ?? null, quantity: line.quantity, seedLotLineId: line.seedLotLineId ?? null, note: line.note ?? null })),
    }, issue.id);
    setPending(false);
    if (result.status === "success") { notify({ tone: "success", title: `Đã lưu phiếu ${issue.code}.` }); onChanged(); } else setError(problemText(result));
  }

  return <div className={listStyles.tabBody}>{confirmation.dialog}
    <header className={styles.head}><div><h3>{issue.code}</h3><IssueStatus statusId={issue.statusId} /></div></header>
    <div className={styles.headFacts}>
      <div><span>Người tạo:</span><strong>{issue.createdBy ?? "—"}</strong></div>
      <div><span>Thời gian:</span>{editable ? <DatePickerField label="Thời gian" withTime value={header.issuedAt} max={nowLocal()} onChange={(issuedAt) => setHeader((current) => ({ ...current, issuedAt }))} />
        : <strong>{viDateTime(issue.issuedAt)}</strong>}</div>
      {use ? <>
        <div><span>Vùng:</span><strong>{issue.zoneCode ?? "—"}</strong></div>
        <div><span>Bè:</span><strong>{issue.raftCode ?? "—"}</strong></div>
        <div><span>Loại xuất:</span><strong>{issue.issueTypeName ?? "—"}</strong></div>
        <div><span>Người nhận:</span><strong>{issue.receiverName ?? "—"}</strong></div>
      </> : <div><span>Lý do:</span><strong>{issue.reason ?? "—"}</strong></div>}
      {issue.statusId === ISSUE.cancelled && <>
        <div><span>Hủy lúc:</span><strong>{issue.cancelledAt ? viDateTime(issue.cancelledAt) : "—"}</strong></div>
        <div><span>Lý do hủy:</span><span className={styles.danger}>{issue.cancelReason ?? "—"}</span></div>
      </>}
    </div>
    <div className={styles.innerScroll}><table className={styles.inner}><thead><tr><th>Mã hàng</th><th>Tên hàng</th><th className={styles.num}>Số lượng</th><th className={styles.num}>Giá vốn</th><th className={styles.num}>Giá trị</th></tr></thead>
      <tbody>
        <tr className={styles.lineSearch}><td style={{ width: 140 }}><input type="search" aria-label="Tìm mã hàng" placeholder="Tìm mã" value={codeTerm} onChange={(event) => setCodeTerm(event.target.value)} /></td><td><input type="search" aria-label="Tìm tên hàng" placeholder="Tìm tên hàng" value={nameTerm} onChange={(event) => setNameTerm(event.target.value)} /></td><td colSpan={3} /></tr>
        {shown.map((line) => <tr key={line.id}>
          <td><Link className={styles.link} href={itemHref(line.itemCode)}>{line.itemCode}</Link></td>
          <td>{line.itemName} <span className={styles.sub}>{line.unit}{line.seedLotCode ? ` · Lô giống ${line.seedLotCode}` : ""}{line.note ? ` · ${line.note}` : ""}</span></td>
          <td className={styles.num}>{fmt(line.quantity)}</td><td className={styles.num}>{fmt(line.unitCost)}</td><td className={styles.num}><strong>{fmt(line.value)}</strong></td></tr>)}
        {!shown.length && <tr><td colSpan={5} className={styles.empty}>{issue.lines.length ? "Không có dòng hàng phù hợp." : "Phiếu chưa có hàng."}</td></tr>}
      </tbody></table></div>
    <div className={styles.foot}>
      <textarea className={styles.noteEdit} aria-label="Ghi chú" placeholder="Ghi chú..." readOnly={!editable} maxLength={1000} value={header.notes} onChange={(event) => setHeader((current) => ({ ...current, notes: event.target.value }))} />
      <div className={styles.sums}>
        <div><span>Số lượng mặt hàng</span><span>{issue.lines.length}</span></div>
        <div><span>Tổng số lượng</span><span>{fmt(quantity)}</span></div>
        <div className={styles.strong}><span>Tổng giá trị</span><span>{fmt(issue.totalValue)}</span></div>
        {issue.completedAt && <div><span>Hoàn thành lúc</span><span>{viDateTime(issue.completedAt)}</span></div>}
      </div>
    </div>
    <ErrorNotice error={error} />
    <footer className={listStyles.tabFooter}>
      <div>
        {draft && access.remove && <Button className="w-auto" variant="ghost" isPending={pending} onClick={() => void remove()}><InterfaceIcon name="trash" className="size-4" />Xóa phiếu tạm</Button>}
        {completed && access.remove && <Button className="w-auto" variant="ghost" isPending={pending} onClick={() => void cancel()}><InterfaceIcon name="trash" className="size-4" />Hủy</Button>}
        {!draft && access.create && <Button className="w-auto" variant="ghost" disabled={pending} onClick={() => router.push(`${info.path}/new?copy=${issue.id}`)}><InterfaceIcon name="document" className="size-4" />Sao chép</Button>}
      </div>
      <div>
        {editable && <Button className="w-auto" disabled={pending} onClick={() => router.push(`${info.path}/${issue.id}/edit`)}><InterfaceIcon name="pencil" className="size-4" />Mở phiếu</Button>}
        {editable && <Button className="w-auto" variant="secondary" isPending={pending} disabled={!dirty} onClick={() => void saveHeader()}><InterfaceIcon name="check" className="size-4" />Lưu</Button>}
      </div>
    </footer>
  </div>;
}
