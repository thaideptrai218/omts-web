"use client";
import Link from "next/link";
import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { InterfaceIcon } from "@/components/ui/interface-icon";
import { ListStateMessage, ManagementPagination } from "@/components/ui/management-screen/management-table";
import { SelectBox } from "@/components/ui/select-box";
import { Switch } from "@/components/ui/switch";
import { ErrorNotice, Skeleton, useMutation, useRemote } from "@/features/operations/ui";
import { fmt, viDateTime } from "@/features/purchase-documents/document-parts";
import listStyles from "@/features/suppliers-api/suppliers.module.css";
import { movementKinds } from "./contracts";
import { movementHref, movementKindLabel, signed } from "./item-helpers";
import { inputRepository } from "./repository";
import styles from "./input-items.module.css";

/** Nhập – xuất: every movement of the item, newest first, with the balance after it; corrections are hidden together with the rows they undo. */
export function ItemMovementsTab({ itemId, canExport }: { itemId: string; canExport: boolean }) {
  const [kind, setKind] = useState(""), [reversals, setReversals] = useState(false), [page, setPage] = useState(1), [pageSize, setPageSize] = useState(15);
  const exportFile = useMutation();
  const remote = useRemote(useCallback((signal: AbortSignal) => inputRepository.movements(itemId,
    { kind: kind || undefined, includeReversals: reversals ? "true" : undefined, page: String(page), pageSize: String(pageSize) }, signal), [itemId, kind, reversals, page, pageSize]));
  const data = remote.data, unit = data?.unit ?? "";
  // Rows an adjustment undid, known from the adjustments on the page.
  const undone = new Set(data?.items.map((row) => row.reversesMovementId).filter(Boolean));
  const hasAdjustments = !!data?.items.some((row) => row.kind === "Reversal");
  return <div className={listStyles.tabBody}>
    <div className={styles.tabTools}>
      <label className={styles.switchLabel}><Switch checked={reversals} onChange={(event) => { setReversals(event.target.checked); setPage(1); }} />Hiện bút toán điều chỉnh</label>
      <label>Loại giao dịch<SelectBox aria-label="Loại giao dịch" className={styles.unitSelect} value={kind} onChange={(event) => { setKind(event.target.value); setPage(1); }}>
        <option value="">Tất cả</option>{movementKinds.filter((key) => key !== "Reversal").map((key) => <option key={key} value={key}>{movementKindLabel[key]}</option>)}</SelectBox></label>
    </div>
    {reversals && data && !hasAdjustments && <p className={styles.hint}>Chưa có bút toán điều chỉnh nào: chưa có phiếu của vật tư này bị sửa hoặc hủy sau khi hoàn thành.</p>}
    {remote.loading ? <Skeleton /> : remote.error || !data ? <ListStateMessage error={remote.error ?? "Không tải được nhập – xuất."} onRetry={remote.reload} />
      : !data.items.length ? <p className={styles.empty}>Chưa có lần nhập hay xuất nào{kind ? " thuộc loại này" : ""}.</p>
      : <div className={styles.innerScroll}><table className={styles.inner}><thead><tr>
        <th>Chứng từ</th><th>Thời gian</th><th>Loại</th><th>Đối tác</th><th>Lô giống</th><th className={styles.num}>Giá giao dịch</th><th className={styles.num}>Giá vốn</th><th className={styles.num}>Số lượng{unit ? ` (${unit})` : ""}</th><th className={styles.num}>Còn lại sau</th>
      </tr></thead><tbody>{data.items.map((row) => {
        const href = movementHref(row.kind, row.documentCode);
        // The opening row has no document: its stored code is the item's own.
        const code = row.kind === "Opening" ? undefined : row.documentCode;
        return <tr key={row.id} className={row.reversesMovementId ? styles.reversed : undone.has(row.id) ? styles.undone : undefined}>
          <td>{href ? <Link className={styles.link} href={href}>{code}</Link> : code ?? "—"}</td>
          <td>{viDateTime(row.occurredAt)}</td><td>{movementKindLabel[row.kind] ?? row.kind}</td><td>{row.partyName || "—"}</td><td>{row.seedLotCode || "—"}</td>
          <td className={styles.num}>{row.transactionPrice == null ? "—" : fmt(row.transactionPrice)}</td><td className={styles.num}>{row.unitCost == null ? "—" : fmt(row.unitCost)}</td>
          <td className={`${styles.num} ${row.quantity < 0 ? styles.neg : ""}`}>{signed(row.quantity, fmt)}</td><td className={styles.num}>{row.balanceAfter == null ? "—" : fmt(row.balanceAfter)}</td>
        </tr>;
      })}</tbody></table></div>}
    {data && <ManagementPagination page={data.page} pageSize={data.pageSize} total={data.total} unit="dòng" onPage={setPage} onPageSize={(size) => { setPageSize(size); setPage(1); }} />}
    <ErrorNotice error={exportFile.error} />
    {canExport && <footer className={listStyles.tabFooter}>
      <div><Button className="w-auto" variant="ghost" isPending={exportFile.pending} onClick={() => void exportFile.run(() => inputRepository.exportMovements(itemId, { kind: kind || undefined, includeReversals: reversals ? "true" : undefined }), true)}><InterfaceIcon name="download" className="size-4" />Xuất file</Button></div>
    </footer>}
  </div>;
}
