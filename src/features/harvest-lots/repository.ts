import { z } from "zod";
import { harvestDetail, harvestLotAnswer } from "@/features/cultivation-api/records-contracts";
import { createOperationsRepository } from "@/features/operations/repository";
import { cageSheet } from "./cage-contracts";
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
  /** The weighing sheet: the cages weighed at the port, the sums, and the trader's cages beside them. */
  cages: (id: string, zoneId: string, signal?: AbortSignal) => repository.read("cages", { id, zoneId }, cageSheet, signal),
  /** `clientOperationId` makes an add safe to send again after a lost answer. Each cage write answers the whole sheet. */
  addCage: (id: string, zoneId: string, body: { kg: number; productId?: string; clientOperationId: string }) => repository.write("cage-add", body, cageSheet, id, zoneId),
  updateCage: (id: string, zoneId: string, body: { cageId: string; kg: number; productId?: string }) => repository.write("cage-update", body, cageSheet, id, zoneId),
  removeCage: (id: string, zoneId: string, cageId: string) => repository.write("cage-remove", { cageId }, cageSheet, id, zoneId),
  /** "Hoàn tất": the kg of the lot become the sum of its cages. */
  weigh: (id: string, zoneId: string, body: unknown) => repository.write("weigh", body, harvestLotAnswer, id, zoneId),
  reopen: (id: string, zoneId: string, body: unknown) => repository.write("reopen", body, harvestLotAnswer, id, zoneId),
  close: (id: string, zoneId: string, body: unknown) => repository.write("close", body, harvestLotAnswer, id, zoneId),
  remove: (id: string, zoneId: string, reason: string, rowVersion: string) => repository.write("remove", { reason, rowVersion }, removed, id, zoneId),
};
