"use client";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { useApiWorkspace } from "@/features/api-workspace/api-workspace-shell";
import { operationAllowed, type OperationArea } from "@/features/operations/permissions";
import { createOperationsRepository } from "@/features/operations/repository";
import { ErrorNotice } from "@/features/operations/ui";
import type { useOperationEditor } from "@/features/operations/use-operation-editor";

/** Shared pieces of the seeding, material-usage and harvest record screens. */
export type RecordsArea = "seeding" | "material-usages" | "harvest";

export const cycleRepo = createOperationsRepository("cultivation-cycles");
export const seedRepo = createOperationsRepository("seeding");
export const materialRepo = createOperationsRepository("material-usages");
export const harvestRepo = createOperationsRepository("harvest");

/** Permission check for one area, scoped to the selected zone. */
export function useAllowed(area: OperationArea, zoneId: string) {
  const context = useApiWorkspace();
  return (action: string) =>
    operationAllowed(area, context.identity, context.permissions.functionPermissions, action, zoneId);
}

/** Non-dismissible dialog wrapper for record editors, with the blocked-write notice and a close button. */
export function EditorFrame({
  title,
  editor,
  error,
  children,
}: {
  title: string;
  editor: ReturnType<typeof useOperationEditor>;
  error?: string;
  children: ReactNode;
}) {
  return (
    <Dialog
      open
      size="lg"
      dismissible={false}
      onCloseRequest={() => void editor.close()}
      title={title}
      onOpenChange={() => {}}
    >
      {editor.dialog}
      <ErrorNotice error={error || editor.mutation.error} />
      {children}
      {editor.mutation.blocked && (
        <p role="alert" className="mt-3 text-sm">
          Kết quả cần được đối chiếu. Bản nháp vẫn được giữ; hãy đọc dữ liệu mới trước khi gửi lệnh tiếp.
        </p>
      )}
      <Button className="mt-4" variant="secondary" disabled={editor.pending} onClick={() => void editor.close()}>
        Đóng
      </Button>
    </Dialog>
  );
}

/** Checkbox group of lane numbers; the selection is kept sorted ascending. */
export function LaneChoices({
  lanes,
  values,
  onChange,
  label = "Làn nuôi",
}: {
  lanes: number[];
  values: number[];
  onChange(values: number[]): void;
  label?: string;
}) {
  return (
    <fieldset className="space-y-2">
      <legend className="text-sm font-medium">{label}</legend>
      <div className="flex flex-wrap gap-2">
        {lanes.map((n) => (
          <label key={n} className="flex items-center gap-2 rounded-control border border-border px-3 py-2 text-sm">
            <input
              type="checkbox"
              checked={values.includes(n)}
              onChange={(e) =>
                onChange(e.target.checked ? [...values, n].sort((a, b) => a - b) : values.filter((v) => v !== n))
              }
            />
            Làn {n}
          </label>
        ))}
      </div>
      {!lanes.length && <p className="text-sm text-text-muted">Không có làn đủ điều kiện.</p>}
    </fieldset>
  );
}
