"use client";
import Link from "next/link";
import { useCallback, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { InterfaceIcon } from "@/components/ui/interface-icon";
import { ListStateMessage, ManagementPagination } from "@/components/ui/management-screen/management-table";
import { SelectBox } from "@/components/ui/select-box";
import { Switch } from "@/components/ui/switch";
import { customerHref } from "@/features/customers/customer-links";
import { ErrorNotice, Skeleton, useMutation, useRemote } from "@/features/operations/ui";
import { fmt, viDate, viDateTime } from "@/features/purchase-documents/document-parts";
import listStyles from "@/features/suppliers-api/suppliers.module.css";
import inputStyles from "@/features/input-items/input-items.module.css";
import { movementKinds, type ProductUnit } from "./contracts";
import { LotLink } from "./lot-link";
import { movementHref, movementKindLabel, signed } from "./product-helpers";
import { productRepository } from "./repository";

/** Nhập – xuất: every movement of the product in kg, newest first, with the balance after it; corrections are hidden together with the rows they undo. */
export function ProductMovementsTab({ productId, note }: { productId: string; note?: ReactNode }) {
  const [kind, setKind] = useState(""), [reversals, setReversals] = useState(false), [page, setPage] = useState(1), [pageSize, setPageSize] = useState(15);
  const remote = useRemote(useCallback((signal: AbortSignal) => productRepository.movements(productId,
    { kind: kind || undefined, includeReversals: reversals ? "true" : undefined, page: String(page), pageSize: String(pageSize) }, signal), [productId, kind, reversals, page, pageSize]));
  const exportFile = useMutation(), data = remote.data;
  // Rows an adjustment undid, known from the adjustments on the page.
  const undone = new Set(data?.items.map((row) => row.reversesMovementId).filter(Boolean));
  const hasAdjustments = !!data?.items.some((row) => row.kind === "Reversal");
  return <div className={listStyles.tabBody}>
    <div className={inputStyles.tabTools}>
      <label className={inputStyles.switchLabel}><Switch checked={reversals} onChange={(event) => { setReversals(event.target.checked); setPage(1); }} />Hiện bút toán điều chỉnh</label>
      <span className="inline-flex items-center gap-3">
        <label>Loại giao dịch<SelectBox aria-label="Loại giao dịch" value={kind} onChange={(event) => { setKind(event.target.value); setPage(1); }}>
        <option value="">Tất cả</option>{movementKinds.filter((key) => key !== "Reversal").map((key) => <option key={key} value={key}>{movementKindLabel[key]}</option>)}</SelectBox></label>
        <Button className="w-auto" variant="secondary" isPending={exportFile.pending} onClick={() => void exportFile.run(() => productRepository.exportMovements(productId, { kind: kind || undefined, includeReversals: reversals ? "true" : undefined }), true)}><InterfaceIcon name="download" className="mr-1 size-4" />Xuất file</Button>
      </span>
    </div>
    {note && <p className={inputStyles.hint}>{note}</p>}
    <ErrorNotice error={exportFile.error} />
    {reversals && data && !hasAdjustments && <p className={inputStyles.hint}>Chưa có bút toán điều chỉnh nào: chưa có lô, hóa đơn hay phiếu của sản phẩm này bị sửa hoặc hủy.</p>}
    {remote.loading ? <Skeleton /> : remote.error || !data ? <ListStateMessage error={remote.error ?? "Không tải được nhập – xuất."} onRetry={remote.reload} />
      : !data.items.length ? <p className={inputStyles.empty}>Chưa có lần nhập hay xuất nào{kind ? " thuộc loại này" : ""}.</p>
      : <div className={inputStyles.innerScroll}><table className={inputStyles.inner}><thead><tr>
        <th>Chứng từ</th><th>Thời gian</th><th>Loại giao dịch</th><th className={inputStyles.num}>Giá giao dịch</th><th className={inputStyles.num}>Số lượng (kg)</th><th className={inputStyles.num}>Còn lại (kg)</th><th>Đối tác</th>
      </tr></thead><tbody>{data.items.map((row) => {
        const href = movementHref(row.documentKind, row.documentCode);
        const partyHref = row.kind === "Sale" && row.partyCode ? customerHref(row.partyCode) : undefined;
        return <tr key={row.id} className={row.reversesMovementId ? inputStyles.reversed : undone.has(row.id) ? inputStyles.undone : undefined}>
          <td>{row.documentKind === "HarvestLot" && row.documentCode ? <LotLink className={inputStyles.link} code={row.documentCode} /> : href ? <Link className={inputStyles.link} href={href}>{row.documentCode}</Link> : row.documentCode ?? "—"}</td>
          <td>{viDateTime(row.occurredAt)}</td><td>{movementKindLabel[row.kind] ?? row.kind}</td>
          <td className={inputStyles.num}>{row.transactionPrice == null ? "—" : fmt(row.transactionPrice)}</td>
          <td className={`${inputStyles.num} ${row.quantityKg < 0 ? inputStyles.neg : ""}`}>{signed(row.quantityKg, fmt)}</td>
          <td className={inputStyles.num}>{row.balanceAfterKg == null ? "—" : fmt(row.balanceAfterKg)}</td>
          <td>{partyHref ? <Link className={inputStyles.link} href={partyHref}>{row.partyName}</Link> : row.partyName || "—"}</td>
        </tr>;
      })}</tbody></table></div>}
    {data && <ManagementPagination page={data.page} pageSize={data.pageSize} total={data.total} unit="dòng" onPage={setPage} onPageSize={(size) => { setPageSize(size); setPage(1); }} />}
  </div>;
}

/** Lô thu hoạch: the lots the product was harvested in, with what was harvested, sold, disposed of and what is left of each. */
export function ProductLotsTab({ productId }: { productId: string }) {
  const remote = useRemote(useCallback((signal: AbortSignal) => productRepository.lots(productId, signal), [productId]));
  if (remote.loading) return <div className={listStyles.tabBody}><Skeleton /></div>;
  const data = remote.data;
  if (remote.error || !data) return <div className={listStyles.tabBody}><ListStateMessage error={remote.error ?? "Không tải được lô thu hoạch."} onRetry={remote.reload} /></div>;
  return <div className={listStyles.tabBody}>
    {!data.lots.length ? <p className={inputStyles.empty}>Chưa có lô thu hoạch nào tách theo sản phẩm này.</p>
      : <div className={inputStyles.innerScroll}><table className={inputStyles.inner}><thead><tr>
        <th>Mã lô</th><th>Thời gian thu hoạch</th><th>Bè</th><th>Vùng</th><th className={inputStyles.num}>Đã thu (kg)</th><th className={inputStyles.num}>Đã bán (kg)</th><th className={inputStyles.num}>Đã hủy (kg)</th><th className={inputStyles.num}>Còn lại (kg)</th>
      </tr></thead><tbody>
        {data.lots.map((lot) => <tr key={lot.lotId}>
          <td><LotLink className={inputStyles.link} code={lot.lotCode} /></td>
          <td>{lot.harvestedAt ? viDateTime(lot.harvestedAt) : lot.harvestDate ? viDate(lot.harvestDate) : "—"}</td><td>{lot.raftCode || "—"}</td><td>{lot.zoneCode || "—"}</td>
          <td className={inputStyles.num}>{fmt(lot.harvestedKg)}</td><td className={inputStyles.num}>{fmt(lot.soldKg)}</td><td className={inputStyles.num}>{fmt(lot.disposedKg)}</td>
          <td className={`${inputStyles.num} ${lot.remainingKg < 0 ? inputStyles.neg : ""}`}>{fmt(lot.remainingKg)}</td>
        </tr>)}
        <tr><td colSpan={7}><strong>Tổng còn lại</strong></td><td className={inputStyles.num}><strong>{fmt(data.totalRemainingKg)}</strong></td></tr>
      </tbody></table></div>}
  </div>;
}

/** Lịch sử giá: every change of a selling price, newest first, of one unit when a unit is picked on the list, else of every unit; the first row of a unit is the price it was created with. */
export function ProductPriceHistoryTab({ productId, unit }: { productId: string; unit?: ProductUnit }) {
  const unitId = unit?.unitId;
  const remote = useRemote(useCallback((signal: AbortSignal) => productRepository.priceHistory(productId, unitId, signal), [productId, unitId]));
  if (remote.loading) return <div className={listStyles.tabBody}><Skeleton /></div>;
  const data = remote.data;
  if (remote.error || !data) return <div className={listStyles.tabBody}><ListStateMessage error={remote.error ?? "Không tải được lịch sử giá."} onRetry={remote.reload} /></div>;
  return <div className={listStyles.tabBody}>
    {!data.length ? <p className={inputStyles.empty}>Chưa có thay đổi giá nào.</p>
      : <div className={inputStyles.innerScroll}><table className={inputStyles.inner}><thead><tr>
        <th>Thời gian</th>{!unit && <th>Đơn vị</th>}<th className={inputStyles.num}>Giá cũ{unit ? ` (đồng/${unit.name})` : ""}</th><th className={inputStyles.num}>Giá mới{unit ? ` (đồng/${unit.name})` : ""}</th><th>Người thay đổi</th>
      </tr></thead><tbody>{data.map((row) => <tr key={row.id}>
        <td>{viDateTime(row.changedAt)}</td>{!unit && <td>{row.unitName || "kg"}</td>}<td className={inputStyles.num}>{row.oldPrice == null ? "—" : fmt(row.oldPrice)}</td><td className={inputStyles.num}>{fmt(row.newPrice)}</td><td>{row.changedBy || "—"}</td>
      </tr>)}</tbody></table></div>}
  </div>;
}
