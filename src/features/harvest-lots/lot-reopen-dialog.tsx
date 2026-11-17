"use client";
import { useState } from "react";
import type { z } from "zod";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast-provider";
import type { harvestDetail } from "@/features/cultivation-api/records-contracts";
import { EditorFrame, RecordFormFooter } from "@/features/cultivation-api/records-shared";
import { Note } from "@/features/operations/ui";
import { useOperationEditor } from "@/features/operations/use-operation-editor";
import { reopenValues } from "./contracts";
import { closeReasonLabel } from "./lot-labels";
import { lotRepository } from "./repository";

type Lot = z.infer<typeof harvestDetail>;

/** "Mở lại lô": a lot closed unsold, spoiled or by the time limit goes back on sale; the reason is required and kept in the history of the lot. */
export function LotReopenDialog({ lot, zoneId, onClose, onSaved }: { lot: Lot; zoneId: string; onClose(): void; onSaved(): void }) {
  const { notify } = useToast();
  const [reason, setReason] = useState(""), [error, setError] = useState<string>();
  const editor = useOperationEditor(onClose, !!reason);

  async function save() {
    const parsed = reopenValues.safeParse({ rowVersion: lot.rowVersion, reason });
    if (!parsed.success) { setError("Nhập lý do mở lại lô (tối đa 1.000 ký tự)."); return; }
    setError(undefined);
    const saved = await editor.mutation.run(() => lotRepository.reopen(lot.id, zoneId, parsed.data));
    if (saved) { notify({ tone: "success", title: `Đã mở lại lô ${lot.lotCode}.` }); onSaved(); }
  }

  return <EditorFrame title={`Mở lại lô ${lot.lotCode}`} editor={editor} error={error}>
    <form onSubmit={(event) => { event.preventDefault(); void save(); }}>
      <fieldset disabled={editor.disabled} className="space-y-3">
        <p className="text-sm text-text-muted">Lô{lot.closeReason ? ` đã đóng (${(closeReasonLabel[lot.closeReason] ?? lot.closeReason).toLowerCase()})` : " đã đóng"} sẽ được bán lại; số kg đã trừ khi đóng lô được hoàn lại vào kho.</p>
        <Note label="Lý do mở lại *" required maxLength={1000} autoFocus value={reason} onChange={(event) => setReason(event.target.value)} />
      </fieldset>
      <RecordFormFooter>
        <Button type="button" variant="secondary" disabled={editor.pending} onClick={() => void editor.close()}>Bỏ qua</Button>
        <Button type="submit" isPending={editor.mutation.pending} disabled={editor.disabled || !reason.trim()}>Mở lại lô</Button>
      </RecordFormFooter>
    </form>
  </EditorFrame>;
}
