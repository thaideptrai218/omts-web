import { createOperationsRepository } from "@/features/operations/repository";
import { readCycles } from "@/features/cycles-api/repository";
import { historyList } from "./history-contracts";

/** Change history of one record through its BFF read; each answers `WorkspaceResult<HistoryEntry[]>` (a 404 means "no history endpoint / no history"). */
export type HistoryKind = "harvest" | "seeding" | "material-usages" | "care-log" | "cycle";
export function readRecordHistory(kind: HistoryKind, id: string, zoneId: string, signal?: AbortSignal) {
  if (kind === "cycle") return readCycles({ action: "cycle-history", cycleId: id }, historyList, signal);
  if (kind === "care-log") return createOperationsRepository("cultivation-cycles").read("log-history", { id, zoneId }, historyList, signal);
  return createOperationsRepository(kind).read("history", { id, zoneId }, historyList, signal);
}
