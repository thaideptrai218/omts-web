"use client";
import { useState } from "react";
import type { z } from "zod";
import { UnitField } from "@/components/form/number-fields";
import { Button } from "@/components/ui/button";
import { DatePickerField } from "@/components/ui/management-screen/date-picker-field";
import { managementStyles } from "@/components/ui/management-screen/management-table";
import { useToast } from "@/components/ui/toast-provider";
import type { harvestDetail } from "@/features/cultivation-api/records-contracts";
import { EditorFrame, RecordFormFooter } from "@/features/cultivation-api/records-shared";
import { fmt, nowLocal, viDateTime, vnLocal } from "@/features/purchase-documents/document-parts";
import { toApiTime } from "@/features/operations/ui";
import { useOperationEditor } from "@/features/operations/use-operation-editor";
import { weighedKgValue, weighValues } from "./contracts";
import { lotRepository } from "./repository";

type Lot = z.infer<typeof harvestDetail>;
/** The kg typed as text ("12,5" or "12.5"); null when empty or not a number. */
const kgOf = (text: string) => { const value = Number(text.trim().replace(",", ".")); return text.trim() && Number.isFinite(value) ? value : null; };
const kgProblem = (text: string) => weighedKgValue.safeParse(kgOf(text)).success ? undefined : "phải lớn hơn 0 và có tối đa 3 số lẻ.";

/**
 * "Cân thực tế", inline in the opened row (not a pop-up): one weighed kg for every product line of the lot, with the estimate beside it, or one kg for a lot without lines. The time defaults to now (the API takes now when it is
 * left out) and may be typed, but not before the harvest or in the future. Weighing again shows the kg of the last weighing and replaces it.
 */
export function LotWeighForm({ lot, zoneId, onClose, onSaved }: { lot: Lot; zoneId: string; onClose(): void; onSaved(): void }) {
  const { notify } = useToast();
  const lines = lot.productLines ?? [], again = lot.weighedKg != null;
  // A first weighing starts empty; weighing again starts from the kg of the last weighing.
  const [start] = useState(() => ({ kgs: lines.map((line) => line.weighedKg != null ? String(line.weighedKg) : ""), single: lot.weighedKg != null ? String(lot.weighedKg) : "" }));
  const [kgs, setKgs] = useState(start.kgs), [single, setSingle] = useState(start.single);
  const [at, setAt] = useState(nowLocal), [atChanged, setAtChanged] = useState(false), [error, setError] = useState<string>();
  const editor = useOperationEditor(onClose, kgs.join("|") !== start.kgs.join("|") || single !== start.single || atChanged);
  const total = lines.length ? kgs.reduce((sum, text) => sum + (kgOf(text) ?? 0), 0) : kgOf(single) ?? 0;

  async function save() {
    for (const [index, line] of lines.entries()) {
      const problem = kgProblem(kgs[index]);
      if (problem) { setError(`${line.productName}: kg cân ${problem}`); return; }
    }
    if (!lines.length && kgProblem(single)) { setError(`Kg cân ${kgProblem(single)}`); return; }
    if (atChanged && (at < vnLocal(lot.harvestedAt) || at > nowLocal())) { setError("Giờ cân không được trước giờ thu hoạch hoặc ở tương lai."); return; }
    const parsed = weighValues.safeParse({
      rowVersion: lot.rowVersion, ...(atChanged && at ? { weighedAt: toApiTime(at) } : {}),
      lines: lines.map((line, index) => ({ lineNumber: line.lineNumber ?? index + 1, weighedKg: kgOf(kgs[index]) })), ...(lines.length ? {} : { weighedKg: kgOf(single) }),
    });
    if (!parsed.success) { setError("Số kg cân chưa hợp lệ."); return; }
    setError(undefined);
    const saved = await editor.mutation.run(() => lotRepository.weigh(lot.id, zoneId, parsed.data));
    if (saved) { notify({ tone: "success", title: `${again ? "Đã cân lại" : "Đã cân"} lô ${lot.lotCode}: ${fmt(total)} kg.` }); onSaved(); }
  }

  return <EditorFrame inline title={`Cân thực tế lô ${lot.lotCode}`} editor={editor} error={error}>
    <form className={managementStyles.theme} onSubmit={(event) => { event.preventDefault(); void save(); }}>
      <fieldset disabled={editor.disabled} className="space-y-4">
        <p className="text-sm text-text-muted">{again ? "Cân lại thay số kg đã cân; hàng trong kho của lô được ghi lại theo số mới." : "Nhập số kg cân thực tế. Lô chỉ được bán sau khi cân."}</p>
        {again && <p role="status" className="rounded-control border border-border bg-surface-subtle p-3 text-sm">Lần cân trước: <strong>{fmt(lot.weighedKg)} kg</strong>{lot.weighedAt ? ` lúc ${viDateTime(lot.weighedAt)}` : ""}{lot.weighedByName ? ` · ${lot.weighedByName}` : ""}</p>}
        <div className="grid gap-3">
          {lines.map((line, index) => <div key={line.productId} className="grid items-end gap-x-4 gap-y-1 sm:grid-cols-[minmax(0,1fr)_minmax(0,240px)]">
            <UnitField label={`${line.productName} (${line.productCode})`} accessibleName={`Kg cân ${line.productName}`} unit="kg" decimals={3} min={0.001} required value={kgs[index]}
              onChange={(value) => setKgs((current) => current.map((text, at) => at === index ? value : text))} />
            <p className="pb-2 text-xs text-text-muted">Ước tính {fmt(line.kg)} kg{line.weighedKg != null ? ` · cân trước ${fmt(line.weighedKg)} kg` : ""}</p>
          </div>)}
          {!lines.length && <div className="grid items-end gap-x-4 gap-y-1 sm:grid-cols-[minmax(0,1fr)_minmax(0,240px)]">
            <UnitField label="Kg cân thực tế" unit="kg" decimals={3} min={0.001} required value={single} onChange={setSingle} />
            <p className="pb-2 text-xs text-text-muted">Ước tính {fmt(lot.estimatedKg)} kg</p>
          </div>}
        </div>
        <p className="text-sm">Tổng kg cân: <strong className="tabular-nums">{fmt(total)} kg</strong> <span className="text-text-muted">(ước tính {fmt(lot.estimatedKg)} kg)</span></p>
        <div className="max-w-xs">
          <span className="block text-xs font-medium text-text-muted">Thời gian cân</span>
          <DatePickerField label="Thời gian cân" withTime value={at} min={vnLocal(lot.harvestedAt)} max={nowLocal()} onChange={(value) => { setAt(value); setAtChanged(true); }} />
        </div>
      </fieldset>
      <RecordFormFooter>
        <Button type="button" variant="secondary" disabled={editor.pending} onClick={() => void editor.close()}>Bỏ qua</Button>
        <Button type="submit" isPending={editor.mutation.pending} disabled={editor.disabled}>{again ? "Lưu số cân mới" : "Lưu số cân"}</Button>
      </RecordFormFooter>
    </form>
  </EditorFrame>;
}
