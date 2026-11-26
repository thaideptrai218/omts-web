"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { SelectBox } from "@/components/ui/select-box";
import { fmt, viDateTime } from "@/features/purchase-documents/document-parts";
import type { CageRow, CageSheet } from "./cage-contracts";
import { parseCageKg } from "./cage-weighing-math";

type Props = {
  sheet: CageSheet; editable: boolean; pending: boolean;
  onUpdate(cage: CageRow, kg: number, productId: string | undefined): Promise<boolean>;
  onRemove(cage: CageRow): void;
};

/** One cage being corrected: its kg (and product when the lot has several) in place, Enter saves and Esc gives up. */
function EditRow({ cage, sheet, pending, onSave, onCancel }: { cage: CageRow; sheet: CageSheet; pending: boolean; onSave(kg: number, productId: string | undefined): void; onCancel(): void }) {
  const [text, setText] = useState(String(cage.kg).replace(".", ",")), [productId, setProductId] = useState(cage.productId ?? sheet.products[0]?.productId ?? "");
  const parsed = parseCageKg(text), several = sheet.products.length > 1;
  const save = () => { if (parsed.kg !== undefined) onSave(parsed.kg, several ? productId : undefined); };
  return <div className="flex flex-wrap items-center gap-2" onKeyDown={(event) => { if (event.key === "Escape") onCancel(); }}>
    <input type="text" inputMode="decimal" autoFocus aria-label={`Kg lồng số ${cage.number}`} aria-invalid={parsed.error ? true : undefined} value={text} disabled={pending}
      className="omts-control h-10 w-28 text-right tabular-nums" onChange={(event) => setText(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); save(); } }} />
    {several && <SelectBox aria-label={`Sản phẩm lồng số ${cage.number}`} className="omts-control h-10 w-40" value={productId} onChange={(event) => setProductId(event.target.value)}>
      {sheet.products.map((product) => <option key={product.productId} value={product.productId}>{product.productName}</option>)}
    </SelectBox>}
    <Button type="button" className="w-auto" disabled={parsed.kg === undefined || pending} onClick={save}>Lưu</Button>
    <Button type="button" variant="secondary" className="w-auto" disabled={pending} onClick={onCancel}>Bỏ qua</Button>
    {parsed.error && <span role="alert" className="w-full text-xs text-danger">{parsed.error}</span>}
  </div>;
}

/**
 * The cages weighed, in order, with the trader's cage of the same position beside them when the lot has a trader (compared by position, as the API does).
 * A difference between the two scales is highlighted. At 360 px the time moves under the number so the kg and the buttons stay in view.
 */
export function CageSheetTable({ sheet, editable, pending, onUpdate, onRemove }: Props) {
  const [editing, setEditing] = useState<string>();
  const trader = Boolean(sheet.traderName), several = sheet.products.length > 1;
  const productName = (id: string | null | undefined) => sheet.products.find((product) => product.productId === id)?.productName ?? "—";
  const rows = Math.max(sheet.cages.length, trader ? sheet.traderCages.length : 0);
  if (!rows) return <p role="status" className="rounded-control border border-dashed border-border p-6 text-center text-sm text-text-muted">Chưa cân lồng nào</p>;
  return <div className="overflow-x-auto rounded-control border border-border">
    <table className="w-full min-w-0 border-collapse text-sm">
      <caption className="sr-only">Các lồng đã cân</caption>
      <thead className="bg-surface-subtle text-left text-xs text-text-muted"><tr>
        <th scope="col" className="px-3 py-2 font-medium">Lồng</th>
        {several && <th scope="col" className="px-3 py-2 font-medium">Sản phẩm</th>}
        <th scope="col" className="px-3 py-2 text-right font-medium">Kg</th>
        <th scope="col" className="hidden px-3 py-2 font-medium sm:table-cell">Giờ cân</th>
        {trader && <><th scope="col" className="px-3 py-2 text-right font-medium">Thương lái cân</th><th scope="col" className="px-3 py-2 text-right font-medium">Chênh</th></>}
        {editable && <th scope="col" className="px-3 py-2 text-right font-medium"><span className="sr-only">Thao tác</span></th>}
      </tr></thead>
      <tbody>
        {Array.from({ length: rows }, (_, index) => {
          const cage = sheet.cages[index], other = trader ? sheet.traderCages[index] : undefined;
          const difference = cage && other ? Math.round((other.kg - cage.kg) * 1000) / 1000 : undefined;
          const open = cage && editing === cage.id;
          return <tr key={cage?.id ?? other?.id ?? index} className="border-t border-border align-middle">
            <td className="px-3 py-2 tabular-nums">{cage ? <>{fmt(cage.number)}{cage.weighedAt && <span className="block text-xs text-text-muted sm:hidden">{viDateTime(cage.weighedAt)}</span>}</> : <span className="text-text-muted">{fmt(other?.number)}</span>}</td>
            {several && <td className="px-3 py-2">{cage ? productName(cage.productId) : "—"}</td>}
            {open
              ? <td className="px-3 py-2" colSpan={2}><EditRow cage={cage} sheet={sheet} pending={pending} onCancel={() => setEditing(undefined)} onSave={(kg, productId) => { void onUpdate(cage, kg, productId).then((saved) => { if (saved) setEditing(undefined); }); }} /></td>
              : <><td className="px-3 py-2 text-right font-semibold tabular-nums">{cage ? fmt(cage.kg) : "—"}</td>
                <td className="hidden px-3 py-2 text-text-muted sm:table-cell">{cage?.weighedAt ? viDateTime(cage.weighedAt) : "—"}</td></>}
            {trader && <>
              <td className="px-3 py-2 text-right tabular-nums">{other ? fmt(other.kg) : "—"}</td>
              <td className={`px-3 py-2 text-right tabular-nums ${difference ? "font-semibold text-danger" : "text-text-muted"}`}>
                {difference === undefined ? "—" : difference === 0 ? "Khớp" : <>{difference > 0 ? "+" : "−"}{fmt(Math.abs(difference))}<span className="sr-only"> kg, lệch</span></>}
              </td>
            </>}
            {editable && <td className="px-3 py-2 text-right">{cage && !open && <span className="inline-flex gap-1">
              <Button type="button" variant="ghost" className="w-auto" disabled={pending} aria-label={`Sửa lồng số ${cage.number}`} onClick={() => setEditing(cage.id)}>Sửa</Button>
              <Button type="button" variant="ghost" className="w-auto" disabled={pending} aria-label={`Xóa lồng số ${cage.number}`} onClick={() => onRemove(cage)}>Xóa</Button>
            </span>}</td>}
          </tr>;
        })}
      </tbody>
    </table>
  </div>;
}
