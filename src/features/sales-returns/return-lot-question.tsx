"use client";
import { useEffect, useRef, useState } from "react";
import { UnitField } from "@/components/form/number-fields";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { SelectBox } from "@/components/ui/select-box";
import { ErrorNotice } from "@/features/operations/ui";
import { fmt } from "@/features/purchase-documents/document-parts";
import { thrownAwayAnswer, type ThrownAwayAnswer } from "./return-contracts";

/** What the API asks about one lot (MSG-HARVEST-02): the lot of oysters thrown away that is still for sale. */
export type LotQuestion = { harvestLotId: string; lotCode: string; discardedKg: number; remainingKg: number };
const kgOf = (text: string) => { const value = Number(text.trim().replace(",", ".")); return text.trim() && Number.isFinite(value) ? value : null; };

/**
 * The question of a lot whose oysters are all thrown away while the lot is still for sale: keep it for sale, or close it now with the kg that was not sold (and why).
 * `ask` answers `null` when the user steps back; the save then stops and nothing was recorded.
 */
export function useLotQuestion() {
  const [question, setQuestion] = useState<LotQuestion>();
  const resolve = useRef<((answer: ThrownAwayAnswer | null) => void) | undefined>(undefined);
  useEffect(() => () => { resolve.current?.(null); resolve.current = undefined; }, []);
  function ask(next: LotQuestion) {
    if (resolve.current) return Promise.resolve(null);
    setQuestion(next);
    return new Promise<ThrownAwayAnswer | null>((done) => { resolve.current = done; });
  }
  function finish(answer: ThrownAwayAnswer | null) { const done = resolve.current; resolve.current = undefined; setQuestion(undefined); done?.(answer); }
  return { ask, dialog: question && <LotQuestionDialog key={question.harvestLotId} question={question} onAnswer={finish} /> };
}

function LotQuestionDialog({ question, onAnswer }: { question: LotQuestion; onAnswer(answer: ThrownAwayAnswer | null): void }) {
  const [keep, setKeep] = useState(true), [leftover, setLeftover] = useState(String(Math.max(0, question.remainingKg))), [reason, setReason] = useState<"Unsold" | "Spoiled">("Unsold"), [error, setError] = useState<string>();
  const left = kgOf(leftover);

  function submit() {
    const parsed = thrownAwayAnswer.safeParse(keep ? { harvestLotId: question.harvestLotId, stillForSale: true }
      : { harvestLotId: question.harvestLotId, stillForSale: false, leftoverKg: left, ...(left ? { closeReason: reason } : {}) });
    if (!parsed.success) { setError("Số kg còn lại phải từ 0 trở lên và là số hợp lệ."); return; }
    onAnswer(parsed.data);
  }
  return <Dialog open title={`Lô ${question.lotCode} còn đang bán`} dismissible={false} mobileLayout="compact" onOpenChange={(open) => { if (!open) onAnswer(null); }}>
    <p className="text-sm leading-6 text-text">Phiếu trả hàng hủy bỏ {fmt(question.discardedKg)} kg của lô {question.lotCode}, lô còn {fmt(question.remainingKg)} kg đang để bán. Lô này còn để bán tiếp không?</p>
    <div role="radiogroup" aria-label={`Lô ${question.lotCode}`} className="mt-3 grid gap-2 text-sm">
      <label className="flex items-center gap-2"><input type="radio" className="omts-check" name="lot-keep" checked={keep} onChange={() => setKeep(true)} />Vẫn để bán</label>
      <label className="flex items-center gap-2"><input type="radio" className="omts-check" name="lot-keep" checked={!keep} onChange={() => setKeep(false)} />Đóng lô ngay</label>
    </div>
    {!keep && <div className="mt-3 grid gap-3">
      <UnitField label="Kg còn lại không bán" unit="kg" decimals={2} min={0} required value={leftover} onChange={setLeftover} />
      {!!left && <label className="block text-xs font-medium text-text-muted">Lý do
        <SelectBox aria-label="Lý do còn lại" className="omts-control mt-1" value={reason} onChange={(event) => setReason(event.target.value as "Unsold" | "Spoiled")}>
          <option value="Unsold">Không bán hết</option><option value="Spoiled">Hư hỏng</option>
        </SelectBox></label>}
      <p className="text-xs text-text-muted">Chỉ nhập số kg hàu chưa bán, không tính phần hủy bỏ của phiếu này.</p>
    </div>}
    <ErrorNotice error={error} />
    <div className="mt-5 flex flex-wrap justify-end gap-2">
      <Button type="button" className="w-auto" variant="secondary" onClick={() => onAnswer(null)}>Quay lại</Button>
      <Button type="button" className="w-auto" onClick={submit}>Tiếp tục</Button>
    </div>
  </Dialog>;
}
