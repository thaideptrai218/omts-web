import { z } from "zod";
import { harvestDetail, harvestLotAnswer } from "@/features/cultivation-api/records-contracts";
import { createOperationsRepository } from "@/features/operations/repository";
import { lotMovements, lotPage, type LotListQuery } from "./contracts";

const repository = createOperationsRepository("harvest");
const removed = z.object({ done: z.literal(true) });

/** The calls of the Lô thu hoạch screen, all through the harvest door of the BFF (`/api/operations/harvest`). */
export const lotRepository = {
  list: (query: LotListQuery, signal?: AbortSignal) => repository.read("lots", query, lotPage, signal),
  /** The file takes the same filters as the list, without paging. */
  exportList: (query: LotListQuery) => repository.download(query),
  movements: (id: string, zoneId: string, signal?: AbortSignal) => repository.read("movements", { id, zoneId }, lotMovements, signal),
  detail: (id: string, zoneId: string, signal?: AbortSignal) => repository.read("detail", { id, zoneId }, harvestDetail, signal),
  weigh: (id: string, zoneId: string, body: unknown) => repository.write("weigh", body, harvestLotAnswer, id, zoneId),
  reopen: (id: string, zoneId: string, body: unknown) => repository.write("reopen", body, harvestLotAnswer, id, zoneId),
  close: (id: string, zoneId: string, body: unknown) => repository.write("close", body, harvestLotAnswer, id, zoneId),
  remove: (id: string, zoneId: string, reason: string, rowVersion: string) => repository.write("remove", { reason, rowVersion }, removed, id, zoneId),
};
