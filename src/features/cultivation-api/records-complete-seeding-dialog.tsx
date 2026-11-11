"use client";
import { useMemo } from "react";
import { z } from "zod";
import { useToast } from "@/components/ui/toast-provider";
import { Button } from "@/components/ui/button";
import { Skeleton, useRemote } from "@/features/operations/ui";
import { useOperationEditor } from "@/features/operations/use-operation-editor";
import * as c from "./records-contracts";
import { EditorFrame, seedRepo } from "./records-shared";

const completed = z.object({ cycle: z.object({ id: z.guid() }) });

/**
 * Shows which lanes are still unseeded, then marks seeding of the cycle as complete.
 * When no lane has seed the backend asks (409 MSG-CYCLE-01, confirmFlag confirmEmpty): the question is answered inline with Bỏ qua / Xác nhận.
 */
export function CompleteSeeding({ cycleId, zoneId, onClose, onSaved }: { cycleId: string; zoneId: string; onClose(): void; onSaved(): void }) {
  const preview = useRemote(useMemo(() => (signal: AbortSignal) => seedRepo.read("preview", { id: cycleId, zoneId }, c.seedingPreview, signal), [cycleId, zoneId]));
  const { notify } = useToast();
  const editor = useOperationEditor(onClose, false);
  const failure = editor.mutation.failure, askEmpty = failure?.httpStatus === 409 && failure.problem?.confirmFlag === "confirmEmpty";
  const send = (confirmEmpty: boolean) => seedRepo.write("complete", { rowVersion: preview.data!.cycleRowVersion, ...(confirmEmpty ? { confirmEmpty: true } : {}) }, completed, cycleId, zoneId);
  const done = () => { notify({ tone: "success", title: "Đã hoàn tất thả giống." }); onSaved(); };
  return (
    <EditorFrame title="Hoàn tất thả giống" editor={editor} error={preview.error}>
      {preview.loading ? <Skeleton /> : preview.data && <>
        <p>Đã thả giống {preview.data.seededCount}/{preview.data.laneCount} làn.</p>
        <p className="my-3">{preview.data.notSeededLanes.length ? `Các làn chưa thả giống: ${preview.data.notSeededLanes.join(", ")}.` : "Tất cả làn đã được thả giống."}</p>
        {askEmpty && <section role="alert" aria-label="Xác nhận hoàn tất khi chưa thả giống" className="my-3 grid gap-3 rounded-control border border-warning/30 bg-warning-soft p-3 text-sm">
          <p><strong>Chưa làn nào có giống.</strong> Vẫn hoàn tất thả giống{failure?.problem?.laneNumbers?.length ? ` (làn ${failure.problem.laneNumbers.join(", ")} chưa có giống)` : ""}? Việc này được ghi vào nhật ký.</p>
          <div className="flex justify-end gap-2">
            <Button key="empty-dismiss" type="button" className="w-auto" variant="secondary" disabled={editor.mutation.pending} onClick={() => editor.mutation.reviewed()}>Bỏ qua</Button>
            <Button key="empty-confirm" type="button" className="w-auto" isPending={editor.mutation.pending} onClick={async () => { if (await editor.mutation.run(() => send(true))) done(); }}>Xác nhận</Button>
          </div>
        </section>}
        <div className="flex justify-end gap-2">
          <Button key="discard-complete" type="button" variant="secondary" disabled={editor.pending} onClick={() => void editor.close()}>Bỏ qua</Button>
          <Button key="confirm-complete" type="button" disabled={editor.disabled || askEmpty}
            onClick={async () => { if (await editor.submit("Đánh dấu hoàn tất thả giống và thông báo cho chủ hợp tác xã?", () => send(false))) done(); }}>Xác nhận hoàn tất</Button>
        </div>
      </>}
      {preview.error && <Button type="button" variant="secondary" onClick={preview.reload}>Tải lại thông tin</Button>}
    </EditorFrame>
  );
}
