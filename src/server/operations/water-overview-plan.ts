import "server-only";
import { z } from "zod";
import { zoneOverviewSchema } from "@/features/water-overview/contracts";
import type { OperationPlan } from "./operation-plan";

const query = z.strictObject({ action: z.literal("zones-overview"), inUseOnly: z.enum(["true", "false"]).optional() });

/** Kế hoạch đọc tổng quan chất lượng nước theo vùng (WATER-03 bước 1): GET /api/water-measurements/zones, chỉ nhận inUseOnly tùy chọn. */
export function waterOverviewPlan(method: string, params: URLSearchParams): OperationPlan | undefined {
  if (method !== "GET") return;
  if ([...params.keys()].length !== new Set(params.keys()).size) return;
  const q = query.safeParse(Object.fromEntries(params));
  if (!q.success) return;
  return { area: "water", action: "zones-overview", method: "GET", permission: "View",
    path: `/api/water-measurements/zones${q.data.inUseOnly ? `?inUseOnly=${q.data.inUseOnly}` : ""}`, schema: zoneOverviewSchema };
}
