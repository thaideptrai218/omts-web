"use client";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { SelectBox } from "@/components/ui/select-box";
import { fmt } from "@/features/purchase-documents/document-parts";
import type { CageSheet } from "./cage-contracts";
import { parseCageKg } from "./cage-weighing-math";

/**
 * "Kg của lồng tiếp theo": the one big field of the port. Enter adds the cage and keeps the focus here, so the next cage can be typed at once; comma or dot both work.
 * `onAdd` answers true when the cage was saved (the field is then emptied); a failed add keeps the text so it can be sent again.
 */
export function CageNextInput({ sheet, pending, onAdd }: { sheet: CageSheet; pending: boolean; onAdd(kg: number, productId: string | undefined, text: string): Promise<boolean> }) {
  const input = useRef<HTMLInputElement>(null);
  const [text, setText] = useState(""), [touched, setTouched] = useState(false), [productId, setProductId] = useState(sheet.products[0]?.productId ?? "");
  const parsed = parseCageKg(text), several = sheet.products.length > 1, nextNumber = Math.max(0, ...sheet.cages.map((cage) => cage.number)) + 1;
  // After the answer of the API the input is enabled again: put the cursor back for the next cage.
  useEffect(() => { if (!pending) input.current?.focus(); }, [pending]);

  async function submit() {
    setTouched(true);
    if (parsed.kg === undefined || pending) return;
    if (await onAdd(parsed.kg, several ? productId : undefined, text)) { setText(""); setTouched(false); }
  }
  const message = touched ? parsed.error ?? (text.trim() ? undefined : "Nhập số kg của lồng.") : parsed.error;
  return <form className="rounded-control border border-border bg-surface-subtle p-3 sm:p-4" aria-label="Cân lồng tiếp theo" noValidate onSubmit={(event) => { event.preventDefault(); void submit(); }}>
    <div className="flex flex-wrap items-end gap-3">
      <div className="min-w-0 flex-1 basis-48">
        <label htmlFor="next-cage-kg" className="block text-sm font-medium">Kg của lồng tiếp theo <span className="font-normal text-text-muted">(lồng số {fmt(nextNumber)})</span></label>
        <input ref={input} id="next-cage-kg" type="text" inputMode="decimal" enterKeyHint="done" autoComplete="off" autoFocus value={text} disabled={pending}
          aria-invalid={message ? true : undefined} aria-describedby={message ? "next-cage-kg-error" : undefined} placeholder="0,0"
          className="omts-control mt-1 h-14 w-full text-right text-3xl font-semibold tabular-nums" onChange={(event) => setText(event.target.value)} />
      </div>
      {several && <div className="basis-44">
        <span className="block text-sm font-medium">Sản phẩm</span>
        <SelectBox aria-label="Sản phẩm của lồng" className="omts-control mt-1 h-14" value={productId} onChange={(event) => setProductId(event.target.value)}>
          {sheet.products.map((product) => <option key={product.productId} value={product.productId}>{product.productName}</option>)}
        </SelectBox>
      </div>}
      <Button type="submit" className="h-14 w-full px-6 sm:w-auto" isPending={pending}>Thêm lồng</Button>
    </div>
    {message && <p id="next-cage-kg-error" role="alert" className="mt-2 text-sm text-danger">{message}</p>}
  </form>;
}
