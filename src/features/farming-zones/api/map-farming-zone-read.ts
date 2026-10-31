import { farmingZonePageSchema } from "./farming-zone-contract.schemas";
import type { z } from "zod";

export type FarmingZoneReadResult =
  | Readonly<{ status: "loaded"; page: z.infer<typeof farmingZonePageSchema> }>
  | Readonly<{ status: "invalid-response" }>;

export function mapFarmingZoneListSuccess(httpStatus: number, data: unknown): FarmingZoneReadResult {
  if (httpStatus !== 200) return { status: "invalid-response" };
  const parsed = farmingZonePageSchema.safeParse(data);
  if (!parsed.success) return { status: "invalid-response" };
  return Object.freeze({ status: "loaded", page: parsed.data });
}
