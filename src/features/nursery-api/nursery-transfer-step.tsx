import { Button } from "@/components/ui/button";
import { ErrorNotice, Skeleton } from "@/features/operations/ui";
import type { CycleRow } from "@/features/cycles-api/cycle-model";
import type { NurseryDetail } from "./contracts";
import type { AllocationDraft } from "./nursery-allocation-draft";
import { NurseryAllocationFields } from "./nursery-allocation-fields";
import { nurseryCompletionMessage } from "./nursery-completion-messages";

export function NurseryTransferStep({ rafts, batch, survivors, allocations, onChange }: {
  rafts: { data?: CycleRow[]; loading: boolean; error?: string; reload(): void };
  batch: NurseryDetail; survivors: number; allocations: AllocationDraft[]; onChange(next: AllocationDraft[]): void;
}) {
  return <div className="min-w-0 space-y-3">
    <Button key="reload-available-rafts" type="button" variant="secondary" className="w-auto" disabled={rafts.loading} onClick={rafts.reload}>Tải lại bè nuôi</Button>
    {rafts.loading ? <Skeleton /> : rafts.error ? <ErrorNotice error={nurseryCompletionMessage(rafts.error)} />
      : <NurseryAllocationFields rafts={rafts.data ?? []} batch={batch} survivors={survivors} allocations={allocations} onChange={onChange} />}
  </div>;
}
