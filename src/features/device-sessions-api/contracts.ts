import { z } from "zod";

// One browser or app install with at least one open session of the signed-in account. A session that
// the client sent no device id for is its own entry with a null key and is ended through its session id.
const time = z.iso.datetime({ offset: true });
export const deviceKeySchema = z.string().regex(/^[A-Za-z0-9_-]{43}$/);

export const deviceViewSchema = z.object({
  deviceKey: deviceKeySchema.nullable(),
  clientType: z.enum(["Web", "Mobile"]),
  authMethod: z.enum(["Password", "ZaloMiniApp"]),
  deviceName: z.string().max(200).nullable(),
  userAgent: z.string().max(1024).nullable(),
  maskedIpAddress: z.string().max(64).nullable(),
  firstSignedInAt: time,
  lastActiveAt: time,
  isCurrent: z.boolean(),
  sessionIds: z.array(z.guid()).min(1).max(100),
});
export const deviceListSchema = z.array(deviceViewSchema).max(200);
export type DeviceView = z.infer<typeof deviceViewSchema>;

export const revokeDeviceRequestSchema = z.union([
  z.strictObject({ deviceKey: deviceKeySchema }),
  z.strictObject({ sessionId: z.guid() }),
]);
export type RevokeDeviceRequest = z.infer<typeof revokeDeviceRequestSchema>;

// `signedOut` is true when the revoked sessions included the one making the request.
export const revokeDeviceResultSchema = z.object({ signedOut: z.boolean() });
export const revokeOthersResultSchema = z.object({ count: z.number().int().nonnegative() });
