import { z } from "zod";

/** One raft of the paged list `GET /api/rafts`; `currentCycle` is the Open cultivation cycle the backend joins in (null when none). */
export const raftPageItemSchema = z.object({
  id: z.guid(), zoneId: z.guid(), code: z.string(), size: z.string().nullable().optional(), laneCount: z.number().int().nonnegative().nullable().optional(),
  statusId: z.number().int(), status: z.string(), latitude: z.number().nullable().optional(), longitude: z.number().nullable().optional(),
  currentCycle: z.object({ id: z.guid(), startDate: z.string() }).nullish().transform(value => value ?? null),
});
export const raftPageSchema = z.object({ items: z.array(raftPageItemSchema), page: z.number().int().positive(), pageSize: z.number().int().positive(), total: z.number().int().nonnegative() });
export type RaftPageItem = z.infer<typeof raftPageItemSchema>;
export type RaftPage = z.infer<typeof raftPageSchema>;
export type RaftPageQuery = { zoneId: string; statusId?: string; search?: string; page: number; pageSize: number };
