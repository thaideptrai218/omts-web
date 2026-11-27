import { z } from "zod";
import { cultivationLog } from "@/features/cycles-api/log-contracts";

/** A care log of the Nhật ký screen: the log with the zone it belongs to (extra fields of the backend are ignored, never refused). */
export const logPageItem = cultivationLog.extend({ zoneId: z.guid(), zoneCode: z.string().nullish(), zoneName: z.string().nullish() });
export const logPageSchema = z.object({ items: z.array(logPageItem), page: z.number().int().positive(), pageSize: z.number().int().positive(), total: z.number().int().nonnegative() });
export type LogPageItem = z.infer<typeof logPageItem>;
export type LogPage = z.infer<typeof logPageSchema>;
/** The columns the backend sorts the list by (`sortBy`); `sortDir` is asc or desc. */
export const logSortKeys = ["visitDate", "zone", "raft", "logType", "recordedBy", "recordedAt"] as const;
export type LogSortKey = typeof logSortKeys[number];
export type LogPageQuery = Partial<Record<"zoneId" | "zoneIds" | "raftId" | "logType" | "from" | "to" | "search" | "sortBy" | "sortDir" | "page" | "pageSize", string>>;
