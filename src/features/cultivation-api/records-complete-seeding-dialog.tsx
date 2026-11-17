"use client";
import { useMemo } from "react";
import { compressLaneNumbers } from "@/features/farming-management/lane-ranges";
import { z } from "zod";
import { useToast } from "@/components/ui/toast-provider";
import { Button } from "@/components/ui/button";
import { Skeleton, useRemote } from "@/features/operations/ui";
import { useOperationEditor } from "@/features/operations/use-operation-editor";
import * as c from "./records-contracts";
import { EditorFrame, RecordFormFooter, seedRepo } from "./records-shared";

const completed = z.object({ cycle: z.object({ id: z.guid() }) });

/** This dialog is the only confirmation; a cycle must already have a seeding record. */
export function CompleteSeeding({ cycleId, zoneId, hasRecords, onClose, onSaved }: { cycleId: string; zoneId: string; hasRecords?: boolean; onClose(): void; onSaved(): void }) {
  const preview = useRemote(useMemo(() => (signal: AbortSignal) => seedRepo.read("preview", { id: cycleId, zoneId }, c.seedingPreview, signal), [cycleId, zoneId]));
  const { notify } = useToast();
  const editor = useOperationEditor(onClose, false);
  const hasSeeding = hasRecords ?? (preview.data?.seededCount ?? 0) > 0;
  const send = () => seedRepo.write("complete", { rowVersion: preview.data!.cycleRowVersion }, completed, cycleId, zoneId);
  const done = () => { notify({ tone: "success", title: "Đã hoàn tất thả giống." }); onSaved(); };
  return (
    <EditorFrame title="Hoàn tất thả giống" editor={editor} error={preview.error}>
      {preview.loading ? <Skeleton /> : preview.data && <>
        <p className="mb-3 font-medium">Đánh dấu hoàn tất thả giống và thông báo cho chủ hợp tác xã?</p>
        <p>Đã thả giống {preview.data.seededCount}/{preview.data.laneCount} làn.</p>
        <p className="my-3">{preview.data.notSeededLanes.length ? `Các làn chưa thả giống: ${compressLaneNumbers(preview.data.notSeededLanes)}.` : "Tất cả làn đã được thả giống."}</p>
        {!hasSeeding && <p role="alert" className="my-3 text-sm text-danger">Ghi nhận thả giống trước khi đánh dấu hoàn tất.</p>}
        <RecordFormFooter>
          <Button key="discard-complete" type="button" variant="secondary" disabled={editor.pending} onClick={() => void editor.close()}>Bỏ qua</Button>
          <Button key="confirm-complete" type="button" isPending={editor.mutation.pending} disabled={editor.disabled || !hasSeeding}
            onClick={async () => { if (hasSeeding && await editor.mutation.run(send)) done(); }}>Xác nhận hoàn tất</Button>
        </RecordFormFooter>
      </>}
      {preview.error && <Button type="button" variant="secondary" onClick={preview.reload}>Tải lại thông tin</Button>}
    </EditorFrame>
  );
}
