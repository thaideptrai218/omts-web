import { z } from "zod";
export const traderRequestSchema = z.object({ accountId: z.guid(), displayName: z.string(), phoneNumber: z.string().nullable(), note: z.string().nullable(),
  requestedAt: z.iso.datetime({ offset: true }).nullable(), status: z.enum(["PENDING_APPROVAL", "REJECTED", "ACTIVE"]), rejectionReason: z.string().nullable() });
export type TraderRequest = z.infer<typeof traderRequestSchema>;
export const traderRequestsSchema = z.array(traderRequestSchema);
export const traderDecisionSchema = z.discriminatedUnion("action", [
  z.strictObject({ action: z.literal("approve"), accountId: z.guid(), confirmed: z.literal(true) }),
  z.strictObject({ action: z.literal("reject"), accountId: z.guid(), confirmed: z.literal(true), reason: z.string().trim().min(1).max(1000) }),
]);
