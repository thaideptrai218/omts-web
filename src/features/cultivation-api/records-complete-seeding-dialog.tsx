"use client";
import { useMemo } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Skeleton, useRemote } from "@/features/operations/ui";
import { useOperationEditor } from "@/features/operations/use-operation-editor";
import * as c from "./records-contracts";
import { EditorFrame, seedRepo } from "./records-shared";

/** Shows which lanes are still unseeded, then marks seeding of the cycle as complete. */
export function CompleteSeeding({
  cycleId,
  zoneId,
  onClose,
  onSaved,
}: {
  cycleId: string;
  zoneId: string;
  onClose(): void;
  onSaved(): void;
}) {
  const preview = useRemote(
    useMemo(
      () => (signal: AbortSignal) => seedRepo.read("preview", { id: cycleId, zoneId }, c.seedingPreview, signal),
      [cycleId, zoneId],
    ),
  );
  const editor = useOperationEditor(onClose, false);
  return (
    <EditorFrame title="Hoàn tất thả giống" editor={editor} error={preview.error}>
      {preview.loading ? (
        <Skeleton />
      ) : (
        preview.data && (
          <>
            <p>
              Đã thả giống {preview.data.seededCount}/{preview.data.laneCount} làn.
            </p>
            <p className="my-3">
              {preview.data.notSeededLanes.length
                ? `Các làn chưa thả giống: ${preview.data.notSeededLanes.join(", ")}.`
                : "Tất cả làn đã được thả giống."}
            </p>
            <Button
              disabled={editor.disabled}
              onClick={async () => {
                if (
                  await editor.submit("Đánh dấu hoàn tất thả giống và thông báo cho chủ hợp tác xã?", () =>
                    seedRepo.write(
                      "complete",
                      { rowVersion: preview.data!.cycleRowVersion },
                      z.object({ cycle: z.object({ id: z.guid() }) }),
                      cycleId,
                      zoneId,
                    ),
                  )
                )
                  onSaved();
              }}
            >
              Xác nhận hoàn tất
            </Button>
          </>
        )
      )}
      {preview.error && (
        <Button variant="secondary" onClick={preview.reload}>
          Tải lại thông tin
        </Button>
      )}
    </EditorFrame>
  );
}
