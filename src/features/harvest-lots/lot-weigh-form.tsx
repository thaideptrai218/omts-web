"use client";
import { useState } from "react";
import type { z } from "zod";
import { UnitField } from "@/components/form/number-fields";
import { Button } from "@/components/ui/button";
import { DatePickerField } from "@/components/ui/management-screen/date-picker-field";
import { managementStyles } from "@/components/ui/management-screen/management-table";
import { SelectBox } from "@/components/ui/select-box";
import { useToast } from "@/components/ui/toast-provider";
import type { harvestDetail } from "@/features/cultivation-api/records-contracts";
import { EditorFrame, RecordFormFooter } from "@/features/cultivation-api/records-shared";
import { fmt, nowLocal, viDateTime, vnLocal } from "@/features/purchase-documents/document-parts";
import { toApiTime } from "@/features/operations/ui";
import { useOperationEditor } from "@/features/operations/use-operation-editor";
import { weighedKgValue, weighValues } from "./contracts";
import { lotRepository } from "./repository";

type Lot = z.infer<typeof harvestDetail>;
type Unit = "kg" | "tan";
/** The number typed as text ("12,5" or "12.5"); null when empty or not a number. */
const kgOf = (text: string) => { const value = Number(text.trim().replace(",", ".")); return text.trim() && Number.isFinite(value) ? value : null; };
/** The kg of a value typed in the chosen unit (tấn x 1000, rounded to the 3 decimals the API keeps); null when empty. */
const toKg = (text: string, unit: Unit) => { const value = kgOf(text); return value === null ? null : unit === "tan" ? Math.round(value * 1_000_000) / 1000 : value; };
const kgProblem = (kg: number | null) => weighedKgValue.safeParse(kg).success ? undefined : "phải lớn hơn 0 và có tối đa 3 số lẻ (kg).";

/** What was brought up (cages x kg per cage, an estimate) against what the port scale says: the difference in kg and its share of the estimate. */
export function weighComparison(estimatedKg: number, weighedKg: number) {
  const difference = Math.round((weighedKg - estimatedKg) * 1000) / 1000;
  return { difference, percent: estimatedKg > 0 ? Math.round((difference / estimatedKg) * 1000) / 10 : null };
}
const signedText = (value: number, suffix: string) => `${value > 0 ? "+" : value < 0 ? "−" : ""}${fmt(Math.abs(value))}${suffix}`;

/**
 * "Cân thực tế" at the port, inline in the opened row: the one place where kg are typed. The head shows the lot (code, raft, product, cages brought up and the conversion for reference); each product line
 * takes the weighed kg (or tấn, by the unit chosen) and the form shows the difference with what was brought. The time defaults to now (Vietnam time) and may be edited, but not before the harvest or in the
 * future. Weighing again starts from the kg of the last weighing and replaces it.
 */
export function LotWeighForm({ lot, zoneId, onClose, onSaved }: { lot: Lot; zoneId: string; onClose(): void; onSaved(): void }) {
  const { notify } = useToast();
  const lines = lot.productLines ?? [], again = lot.weighedKg != null;
  const [start] = useState(() => ({ kgs: lines.map((line) => line.weighedKg != null ? String(line.weighedKg) : ""), single: lot.weighedKg != null ? String(lot.weighedKg) : "" }));
  const [kgs, setKgs] = useState(start.kgs), [single, setSingle] = useState(start.single), [unit, setUnit] = useState<Unit>("kg");
  const [at, setAt] = useState(nowLocal), [atChanged, setAtChanged] = useState(false), [error, setError] = useState<string>();
  const editor = useOperationEditor(onClose, kgs.join("|") !== start.kgs.join("|") || single !== start.single || atChanged);
  const total = lines.length ? kgs.reduce((sum, text) => sum + (toKg(text, unit) ?? 0), 0) : toKg(single, unit) ?? 0;
  const typed = lines.length ? kgs.some((text) => kgOf(text) !== null) : kgOf(single) !== null;
  const compared = typed ? weighComparison(lot.estimatedKg, total) : null;

  // Switching the unit converts what is typed, so the same weight stays on screen.
  function changeUnit(next: Unit) {
    if (next === unit) return;
    const convert = (text: string) => { const kg = toKg(text, unit); return kg === null ? text : String(next === "tan" ? Math.round(kg) / 1000 : kg); };
    setKgs((current) => current.map(convert)); setSingle(convert(single)); setUnit(next);
  }

  async function save() {
    for (const [index, line] of lines.entries()) {
      const problem = kgProblem(toKg(kgs[index], unit));
      if (problem) { setError(`${line.productName}: số cân ${problem}`); return; }
    }
    if (!lines.length && kgProblem(toKg(single, unit))) { setError(`Số cân ${kgProblem(toKg(single, unit))}`); return; }
    if (atChanged && (at < vnLocal(lot.harvestedAt) || at > nowLocal())) { setError("Giờ cân không được trước giờ thu hoạch hoặc ở tương lai."); return; }
    const parsed = weighValues.safeParse({
      rowVersion: lot.rowVersion, ...(atChanged && at ? { weighedAt: toApiTime(at) } : {}),
      lines: lines.map((line, index) => ({ lineNumber: line.lineNumber ?? index + 1, weighedKg: toKg(kgs[index], unit) })), ...(lines.length ? {} : { weighedKg: toKg(single, unit) }),
    });
    if (!parsed.success) { setError("Số cân chưa hợp lệ."); return; }
    setError(undefined);
    const saved = await editor.mutation.run(() => lotRepository.weigh(lot.id, zoneId, parsed.data));
    if (saved) { notify({ tone: "success", title: `${again ? "Đã cân lại" : "Đã cân"} lô ${lot.lotCode}: ${fmt(total)} kg.` }); onSaved(); }
  }
  const unitLabel = unit === "tan" ? "tấn" : "kg";

  return <EditorFrame inline title={`Cân thực tế lô ${lot.lotCode}`} editor={editor} error={error}>
    <form className={managementStyles.theme} onSubmit={(event) => { event.preventDefault(); void save(); }}>
      <fieldset disabled={editor.disabled} className="space-y-4">
        <dl className="grid gap-x-6 gap-y-2 rounded-control border border-border bg-surface-subtle p-3 text-sm sm:grid-cols-2 lg:grid-cols-4" aria-label="Lô cần cân">
          <div><dt className="text-xs text-text-muted">Mã lô</dt><dd className="font-mono">{lot.lotCode}</dd></div>
          <div><dt className="text-xs text-text-muted">Bè</dt><dd>{lot.raftCode}</dd></div>
          <div><dt className="text-xs text-text-muted">Sản phẩm</dt><dd>{lines.length ? lines.map((line) => line.productName).join(", ") : "—"}</dd></div>
          <div><dt className="text-xs text-text-muted">Số lồng mang lên</dt><dd className="tabular-nums">{fmt(lot.cageCount)} lồng <span className="block text-xs text-text-muted">quy đổi ≈ {fmt(lot.estimatedKg)} kg, chỉ tham khảo</span></dd></div>
        </dl>
        {again && <p role="status" className="rounded-control border border-border bg-surface-subtle p-3 text-sm">Lần cân trước: <strong>{fmt(lot.weighedKg)} kg</strong>{lot.weighedAt ? ` lúc ${viDateTime(lot.weighedAt)}` : ""}{lot.weighedByName ? ` · ${lot.weighedByName}` : ""}. Cân lại thay số kg này và ghi lại hàng trong kho của lô.</p>}
        <div className="max-w-[200px]">
          <span className="block text-xs font-medium text-text-muted">Đơn vị nhập</span>
          <SelectBox aria-label="Đơn vị nhập số cân" className="omts-control" value={unit} onChange={(event) => changeUnit(event.target.value as Unit)}><option value="kg">Kilogam (kg)</option><option value="tan">Tấn</option></SelectBox>
        </div>
        <div className="grid gap-3">
          {lines.map((line, index) => <div key={line.productId} className="grid items-end gap-x-4 gap-y-1 sm:grid-cols-[minmax(0,1fr)_minmax(0,240px)]">
            <UnitField label={`${line.productName} (${line.productCode})`} accessibleName={`Kg cân ${line.productName}`} unit={unitLabel} decimals={3} min={0.001} required value={kgs[index]}
              onChange={(value) => setKgs((current) => current.map((text, at) => at === index ? value : text))} />
            <p className="pb-2 text-xs text-text-muted">Mang lên {fmt(line.cageCount)} lồng ≈ {fmt(line.kg)} kg</p>
          </div>)}
          {!lines.length && <div className="grid items-end gap-x-4 gap-y-1 sm:grid-cols-[minmax(0,1fr)_minmax(0,240px)]">
            <UnitField label="Số cân thực tế" accessibleName="Kg cân thực tế" unit={unitLabel} decimals={3} min={0.001} required value={single} onChange={setSingle} />
            <p className="pb-2 text-xs text-text-muted">Mang lên {fmt(lot.cageCount)} lồng ≈ {fmt(lot.estimatedKg)} kg</p>
          </div>}
        </div>
        {compared && <p role="status" aria-label="So sánh với số mang lên" className="text-sm">Cân được <strong className="tabular-nums">{fmt(total)} kg</strong>, so với số mang lên: <strong className="tabular-nums">{signedText(compared.difference, " kg")}{compared.percent === null ? "" : ` (${signedText(compared.percent, "%")})`}</strong></p>}
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
