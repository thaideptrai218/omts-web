import { z } from "zod";

// Matches FarmingZonesController.Search on backend develop@953f597.
export const farmingZoneListQuerySchema = z.strictObject({
  search: z.string().trim().min(1).max(200).optional(),
  statusId: z.union([z.literal(101), z.literal(102)]).optional(),
  page: z.number().int().min(1).max(1_000_000),
  pageSize: z.number().int().min(1).max(100),
});

export type FarmingZoneListQuery = z.infer<typeof farmingZoneListQuerySchema>;

export function prepareFarmingZoneListRequest(query: unknown):
  | Readonly<{ status: "prepared"; path: string; method: "GET" }>
  | Readonly<{ status: "invalid-input" }> {
  const parsed = farmingZoneListQuerySchema.safeParse(query);
  if (!parsed.success) return { status: "invalid-input" };
  const params = new URLSearchParams();
  if (parsed.data.search) params.set("search", parsed.data.search);
  if (parsed.data.statusId !== undefined) params.set("statusId", String(parsed.data.statusId));
  params.set("page", String(parsed.data.page));
  params.set("pageSize", String(parsed.data.pageSize));
  return Object.freeze({ status: "prepared", path: `/api/zones?${params}`, method: "GET" });
}
