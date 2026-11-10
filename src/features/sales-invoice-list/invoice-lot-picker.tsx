"use client";
import { useCallback, useEffect, useState } from "react";
import { control, useRemote } from "@/features/operations/ui";
import { lotSearch } from "./invoice-list-contracts";
import { invoiceRepository } from "./use-invoice-list";
import type { LotFilter } from "./invoice-list-logic";
import s from "./invoice-list.module.css";

/** Ô tìm lô thu hoạch theo mã (từ 2 ký tự, trì hoãn gõ) để lọc hóa đơn có dòng thuộc lô đó. Chọn xong hiện mã lô và nút bỏ chọn. */
export function InvoiceLotPicker({ value, disabled, onChange }: { value: LotFilter | null; disabled?: boolean; onChange(lot: LotFilter | null): void }) {
  const [text, setText] = useState(""), [term, setTerm] = useState("");
  useEffect(() => { const t = setTimeout(() => setTerm(text.trim()), 300); return () => clearTimeout(t); }, [text]);
  const found = useRemote(useCallback((signal: AbortSignal) => term.length >= 2 ? invoiceRepository.read("lots", { lotCode: term }, lotSearch, signal) : Promise.resolve({ status: "success" as const, data: undefined }), [term]));

  if (value) {
    return <p className="mt-1.5 flex items-center justify-between gap-2 text-sm"><span>Lô <strong>{value.lotCode}</strong></span><button type="button" className={s.linkButton} disabled={disabled} onClick={() => onChange(null)}>Bỏ chọn</button></p>;
  }
  return (
    <div>
      <input type="search" aria-label="Tìm lô thu hoạch theo mã" placeholder="Nhập mã lô, ví dụ B03…" className={control} value={text} disabled={disabled} onChange={(event) => setText(event.target.value)} />
      {found.loading ? <p className={s.muted} role="status">Đang tìm lô…</p> : found.error ? <p className={s.muted} role="alert">Chưa tìm được lô: {found.error}</p>
        : term.length >= 2 && (
          <ul className={s.pick} aria-label="Kết quả tìm lô">
            {(found.data?.lots ?? []).slice(0, 8).map((lot) => <li key={lot.id}><button type="button" onClick={() => { onChange({ id: lot.id, lotCode: lot.lotCode }); setText(""); setTerm(""); }}>{lot.lotCode} <span className={s.sub}>Vùng {lot.zoneCode}</span></button></li>)}
            {!found.data?.lots.length && <li className={s.muted}>Không tìm thấy lô nào.</li>}
          </ul>)}
    </div>
  );
}
