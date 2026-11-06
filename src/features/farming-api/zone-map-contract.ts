import { z } from "zod";
const point = { latitude: z.number().min(-90).max(90).nullable(), longitude: z.number().min(-180).max(180).nullable() };
export const zoneMapSchema = z.array(z.object({ id: z.guid(), code: z.string(), name: z.string(), ...point,
  statusId: z.number().int(), status: z.string(), rafts: z.array(z.object({ id: z.guid(), code: z.string(), ...point })) }));
export type MapZone = z.infer<typeof zoneMapSchema>[number];
export function mapPointUrl(point: { latitude: number | null; longitude: number | null }) {
  return point.latitude === null || point.longitude === null ? undefined
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${point.latitude},${point.longitude}`)}`;
}
