"use client";
import Link from "next/link";
import { useCallback } from "react";
import type { z } from "zod";
import { UnitField } from "@/components/form/number-fields";
import { Button } from "@/components/ui/button";
import { inputRepository } from "@/features/input-items/repository";
import type { itemRow } from "@/features/input-items/contracts";
import { ErrorNotice, Skeleton, useRemote } from "@/features/operations/ui";

export type MaterialLine = { itemId: string; quantity: string };
export type StockItem = z.infer<typeof itemRow>;
export function LaneIncidentStock({ lines, onChange, onLoaded }: { lines: MaterialLine[]; onChange(lines: MaterialLine[]): void; onLoaded(items: StockItem[]): void }) {
  const stock = useRemote(useCallback(async (signal: AbortSignal) => {
    const result = await inputRepository.all({ group: "Material", statusId: "101" }, signal);
    if (result.status === "success" && !signal.aborted) onLoaded(result.data.filter(item => item.group === "Material" && item.statusId === 101));
    return result;
  }, [onLoaded]));
  if (stock.loading) return <Skeleton />;
  if (stock.error) return <><ErrorNotice error={stock.error} /><Button type="button" variant="secondary" className="w-auto" onClick={stock.reload}>Tải lại tồn kho</Button></>;
  const items = stock.data?.filter(item => item.group === "Material" && item.statusId === 101 && item.onHand > 0) ?? [];
  if (!items.length) return <p className="text-sm">Kho chưa có vật tư. <Link className="text-primary underline" href="/inputs/items">Xem Vật tư &amp; Giống</Link> để bổ sung vật tư trước khi sửa; nếu không thể sửa, chọn Ngừng hoạt động làn.</p>;
  return <fieldset className="grid gap-2"><legend className="mb-2 text-sm font-medium">Vật tư đã dùng</legend>
    {items.map(item => {
      const selected = lines.find(line => line.itemId === item.id);
      return <div key={item.id} className="grid gap-2 rounded-control border border-border p-2 sm:grid-cols-2">
        <label className="flex items-start gap-2 text-sm"><input className="omts-check" type="checkbox" checked={!!selected}
          onChange={event => onChange(event.target.checked ? [...lines, { itemId: item.id, quantity: "" }] : lines.filter(line => line.itemId !== item.id))} />
          <span>{item.code} · {item.name}<small className="block text-text-muted">Tồn kho: {item.onHand.toLocaleString("vi-VN")} {item.unit}</small></span></label>
        {selected && <UnitField label={`Số lượng ${item.code} *`} unit={item.unit} decimals={3} min={0.001} max={item.onHand} required value={selected.quantity}
          onChange={quantity => onChange(lines.map(line => line.itemId === item.id ? { ...line, quantity } : line))} />}
      </div>;
    })}
  </fieldset>;
}
