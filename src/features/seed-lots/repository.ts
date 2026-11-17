import { createOperationsRepository } from "@/features/operations/repository";
import { seedLotDetail, seedLotPage, type SeedLotListQuery } from "./contracts";

const repository = createOperationsRepository("seed-lots");

/** The calls of the Lô giống screen, all through the seed-lots door of the BFF (`/api/operations/seed-lots`). The screen only reads: a lot changes through the receipt, the nursery, the seeding and the return. */
export const seedLotRepository = {
  list: (query: SeedLotListQuery, signal?: AbortSignal) => repository.read("list", query, seedLotPage, signal),
  /** The file takes the same filters as the list, without paging. */
  exportList: (query: SeedLotListQuery) => repository.download(query),
  detail: (id: string, signal?: AbortSignal) => repository.read("detail", { id }, seedLotDetail, signal),
};
