import { z } from "zod";
export const grantRowSchema = z.object({ id: z.guid(), roleId: z.guid(), roleName: z.string(), zoneId: z.guid().nullable(), zoneName: z.string().nullable(), allZones: z.boolean(),
  effectiveFrom: z.iso.date(), effectiveTo: z.iso.date().nullable(), state: z.enum(["Effective", "Expired", "NotYetEffective", "Revoked"]), revokedAt: z.iso.datetime({ offset: true }).nullable(), revokeReason: z.string().nullable() })
  .refine((row) => row.allZones === (row.zoneId === null));
export const grantHistorySchema = z.array(grantRowSchema);
export const revokeGrantSchema = z.strictObject({ accountId: z.guid(), grantId: z.guid(), reason: z.string().trim().min(1).max(1000), confirmed: z.literal(true) });
export const permissionCatalogSchema = z.array(z.object({ code: z.string().min(1), name: z.string(), cooperativeWide: z.boolean(), isDashboardTile: z.boolean(), supportedActions: z.array(z.string()) }))
  .refine((rows) => new Set(rows.map((row) => row.code)).size === rows.length);
export const roleImpactSchema = z.object({ accountCount: z.number().int().nonnegative(), zoneCount: z.number().int().nonnegative(), allZonesGranted: z.boolean(), accounts: z.array(z.string()) });
export const rolePermissionsSchema = z.array(z.object({ functionCode: z.string(), actions: z.array(z.string()), dataScope: z.string() }));
