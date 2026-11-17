"use client";
import { useState } from "react";
import type { z } from "zod";
import { UnitField } from "@/components/form/number-fields";
import { Button } from "@/components/ui/button";
import { SelectBox } from "@/components/ui/select-box";
import { useToast } from "@/components/ui/toast-provider";
import { AttendanceGatePanel, openAttendanceOf, ownerOverride, useIsCooperativeOwner } from "@/features/cultivation-api/record-crew-attendance";
import type { harvestDetail } from "@/features/cultivation-api/records-contracts";
import { EditorFrame, RecordFormFooter } from "@/features/cultivation-api/records-shared";
import { fmt } from "@/features/purchase-documents/document-parts";
import { useOperationEditor } from "@/features/operations/use-operation-editor";
import { closeValues } from "./contracts";
import { lotRepository } from "./repository";

type Lot = z.infer<typeof harvestDetail>;
const kgOf = (text: string) => { const value = Number(text.trim().replace(",", ".")); return text.trim() && Number.isFinite(value) ? value : null; };

/**
 * "Đóng lô": the lot leaves sale with the kg that was not sold (it starts from what is left) and, above 0, why: Không bán hết or Hư hỏng. The kg left is taken off the lot's stock.
 * When employees of the lot are not checked out the API refuses (MSG-LABOR-37) and only the Owner may close anyway, with a reason.
 */
export function LotCloseDialog({ lot, zoneId, onClose, onSaved }: { lot: Lot; zoneId: string; onClose(): void; onSaved(): void }) {
  const { notify } = useToast(), isOwner = useIsCooperativeOwner();
  const [leftover, setLeftover] = useState(() => String(Math.max(0, lot.figures.remainingKg))), [reason, setReason] = useState<"Unsold" | "Spoiled">("Unsold"), [approval, setApproval] = useState(""), [error, setError] = useState<string>();
  const editor = useOperationEditor(onClose, false);
  const openCrew = openAttendanceOf(editor.mutation.failure), left = kgOf(leftover);

  async function save() {
    const parsed = closeValues.safeParse({ rowVersion: lot.rowVersion, leftoverKg: left, ...(left ? { reason } : {}), ...ownerOverride(openCrew, approval) });
    if (!parsed.success) { setError("Số kg còn lại phải từ 0 trở lên và có tối đa 2 số lẻ."); return; }
    setError(undefined);
    const saved = await editor.mutation.run(() => lotRepository.close(lot.id, zoneId, parsed.data));
    if (saved) { notify({ tone: "success", title: `Đã đóng lô ${lot.lotCode}.` }); onSaved(); }
  }

  return <EditorFrame title={`Đóng lô ${lot.lotCode}`} editor={editor} error={error}>
    <form onSubmit={(event) => { event.preventDefault(); void save(); }}>
      <fieldset disabled={editor.disabled} className="space-y-3">
        <p className="text-sm text-text-muted">Đóng lô thì lô không được bán nữa. Còn lại {fmt(lot.figures.remainingKg)} kg; số kg không bán được sẽ trừ khỏi kho và ghi vào lịch sử bán của lô.</p>
        <UnitField label="Kg còn lại không bán" unit="kg" decimals={2} min={0} required value={leftover} onChange={setLeftover} />
        {!!left && <label className="block text-xs font-medium text-text-muted">Lý do
          <SelectBox aria-label="Lý do còn lại" className="omts-control mt-1" value={reason} onChange={(event) => setReason(event.target.value as "Unsold" | "Spoiled")}>
            <option value="Unsold">Không bán hết</option><option value="Spoiled">Hư hỏng</option>
          </SelectBox></label>}
        {openCrew && <AttendanceGatePanel employees={openCrew} isOwner={isOwner} reason={approval} onReason={setApproval} />}
      </fieldset>
      <RecordFormFooter>
        <Button type="button" variant="secondary" disabled={editor.pending} onClick={() => void editor.close()}>Bỏ qua</Button>
        <Button type="submit" isPending={editor.mutation.pending} disabled={editor.disabled || !!openCrew && (!isOwner || !approval.trim())}>Đóng lô</Button>
      </RecordFormFooter>
    </form>
  </EditorFrame>;
}
