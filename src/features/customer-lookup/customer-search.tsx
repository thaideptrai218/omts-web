"use client";
import { useCallback, useEffect, useState } from "react";
import { createWorkspaceRepository } from "@/features/api-workspace/workspace-repository";
import { control, useRemote } from "@/features/operations/ui";
import s from "./customer-search.module.css";

export type PickedCustomer = { id: string; name: string; phoneNumber: string | null };
const customers = createWorkspaceRepository("customers");

/** Ô tìm và chọn một khách hàng có hồ sơ (tìm theo tên hoặc số điện thoại, có trì hoãn gõ). Dùng chung cho hóa đơn và thanh toán. */
export function CustomerSearch({ value, disabled, onSelect }: { value: PickedCustomer | null; disabled?: boolean; onSelect(customer: PickedCustomer | null): void }) {
  const [text, setText] = useState(""), [query, setQuery] = useState("");
  useEffect(() => { const t = setTimeout(() => setQuery(text.trim()), 300); return () => clearTimeout(t); }, [text]);
  const found = useRemote(useCallback((signal: AbortSignal) => customers.list({ search: query, pageSize: "8" }, signal), [query]));

  if (value) {
    return (
      <p className={s.picked}>
        <span><strong>{value.name}</strong><small>{value.phoneNumber ?? "Chưa có số điện thoại"}</small></span>
        <button type="button" disabled={disabled} onClick={() => onSelect(null)}>Đổi</button>
      </p>
    );
  }
  return (
    <div className={s.box}>
      <input type="search" aria-label="Tìm khách hàng" placeholder="Tìm theo tên hoặc số điện thoại…" className={control} value={text} disabled={disabled} onChange={(e) => setText(e.target.value)} />
      {found.loading ? <p className={s.hint} role="status">Đang tìm…</p> : found.error ? <p role="alert" className={s.error}>{found.error}</p> : (
        <ul className={s.list}>
          {(found.data?.items ?? []).map((c) => {
            const phone = typeof c.phoneNumber === "string" ? c.phoneNumber : null;
            return <li key={c.id}><button type="button" disabled={disabled} onClick={() => onSelect({ id: c.id, name: String(c.name), phoneNumber: phone })}><strong>{String(c.name)}</strong><small>{phone ?? "Chưa có số điện thoại"}</small></button></li>;
          })}
          {!found.data?.items.length && <li className={s.hint}>Không tìm thấy khách hàng.</li>}
        </ul>
      )}
    </div>
  );
}
