"use client";
import { SelectBox } from "@/components/ui/select-box";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/ui/management-page";
import { useKgPerCage } from "@/features/harvest-settings-lookup/use-kg-per-cage";
import { control, money, Skeleton } from "@/features/operations/ui";
import type { Product } from "@/features/sales-api/contracts";
import type { LotForSale } from "./contracts";
import { lineAmount, type Draft } from "./invoice-draft";
import { lotRemainingText } from "./invoice-lot-quantity";
import s from "./invoice-screen.module.css";

type Props = {
  lots: { data?: { lots: LotForSale[]; message: string | null }; loading: boolean; error?: string; reload(): void };
  draft: Draft; active: Product[]; listPrice(productId: string): number | null | undefined;
  disabled: boolean; harvestSettingsOwnerId?: string; onAdd(lot: LotForSale): void; onChange(update: (d: Draft) => Draft): void;
};

/** Cột trái: chọn lô thu hoạch còn bán và chỉnh các dòng hàng (sản phẩm, kg, đơn giá). */
export function InvoiceLinesPanel({ lots, draft, active, listPrice, disabled, harvestSettingsOwnerId, onAdd, onChange }: Props) {
  const [search, setSearch] = useState("");
  const { kgPerCage } = useKgPerCage(harvestSettingsOwnerId); // Owner-only read: undefined for others, so kg is shown alone.
  const chosen = new Set(draft.lines.map((l) => l.lot.id));
  const shown = useMemo(() => (lots.data?.lots ?? []).filter((l) => `${l.lotCode} ${l.raftCode} ${l.zoneCode}`.toLocaleLowerCase("vi").includes(search.trim().toLocaleLowerCase("vi"))), [lots.data, search]);
  const edit = (key: string, patch: Partial<Draft["lines"][number]>) => onChange((d) => ({ ...d, lines: d.lines.map((l) => l.key === key ? { ...l, ...patch } : l) }));

  return (
    <div className={s.stack}>
      <section className={s.card} aria-labelledby="lines-title">
        <div className={s.cardHead}><h2 id="lines-title">Dòng hàng</h2><span className={s.muted}>{draft.lines.length} lô đã chọn</span></div>
        {!draft.lines.length ? <p className={s.empty}>Chưa có dòng nào. Chọn lô ở bảng bên dưới để thêm vào hóa đơn.</p> : (
          <div className={s.lineList}>
            <div className={`${s.lineRow} ${s.lineHead}`} aria-hidden="true"><span>Lô</span><span>Sản phẩm</span><span>Số kg</span><span>Đơn giá</span><span className={s.right}>Thành tiền</span><span /></div>
            {draft.lines.map((line, i) => (
              <div className={s.lineRow} key={line.key}>
                <div><strong className={s.code}>{line.lot.lotCode}</strong><div className={s.muted}>{line.lot.raftCode} · {line.lot.zoneCode}</div>
                  {line.lot.originState === "Withdrawn" && <StatusPill tone="danger">Nguồn gốc đã thu hồi</StatusPill>}</div>
                <SelectBox aria-label={`Sản phẩm dòng ${i + 1}`} className={control} disabled={disabled} value={line.productId} onChange={(e) => edit(line.key, { productId: e.target.value })}>
                  <option value="">Chọn sản phẩm</option>{active.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </SelectBox>
                <input aria-label={`Số kg dòng ${i + 1}`} inputMode="decimal" className={`${control} ${s.num}`} disabled={disabled} placeholder={`≤ ${line.lot.remainingKg}`} value={line.kg} onChange={(e) => edit(line.key, { kg: e.target.value })} />
                <input aria-label={`Đơn giá dòng ${i + 1}`} inputMode="numeric" className={`${control} ${s.num}`} disabled={disabled} placeholder={listPrice(line.productId) != null ? money(listPrice(line.productId)).replace(" ₫", "") : "Giá niêm yết"} value={line.unitPrice} onChange={(e) => edit(line.key, { unitPrice: e.target.value })} />
                <strong className={`${s.right} ${s.num}`}>{money(lineAmount(line, listPrice(line.productId)))}</strong>
                <button type="button" className={s.remove} disabled={disabled} aria-label={`Bỏ dòng ${i + 1}`} onClick={() => onChange((d) => ({ ...d, lines: d.lines.filter((l) => l.key !== line.key) }))}>Bỏ</button>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className={s.card} aria-labelledby="lots-title">
        <div className={s.cardHead}><h2 id="lots-title">Lô có thể bán</h2>
          <input type="search" aria-label="Tìm lô" placeholder="Tìm mã lô, bè, vùng…" className={`${control} ${s.search}`} value={search} onChange={(e) => setSearch(e.target.value)} /></div>
        <p className={s.hint}>Số còn lại chỉ để tham khảo, không giới hạn lượng bán. Hóa đơn bán theo kg; số lồng có dấu “≈” là quy đổi từ kg.</p>
        {lots.loading ? <Skeleton /> : lots.error ? <p role="alert" className={s.error}>{lots.error} <Button className="w-auto" variant="secondary" onClick={lots.reload}>Thử lại</Button></p>
          : !shown.length ? <p className={s.empty}>{lots.data?.message ?? "Không có lô nào phù hợp."}</p> : (
          <ul className={s.lotList}>
            {shown.map((lot) => (
              <li key={lot.id} className={s.lot}>
                <div><strong className={s.code}>{lot.lotCode}</strong> <span className={s.muted}>· {lot.raftCode} · {lot.zoneName}</span>
                  <div className={s.muted}>Thu hoạch {new Intl.DateTimeFormat("vi-VN").format(new Date(lot.harvestDate))} · {lotRemainingText(lot, kgPerCage)}</div></div>
                {lot.originState === "Withdrawn" && <StatusPill tone="danger">Đã thu hồi nguồn gốc</StatusPill>}
                <Button className="w-auto" variant="secondary" disabled={disabled || chosen.has(lot.id)} onClick={() => onAdd(lot)}>{chosen.has(lot.id) ? "Đã thêm" : "Thêm"}</Button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
