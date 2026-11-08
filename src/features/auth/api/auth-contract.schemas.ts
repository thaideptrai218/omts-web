import { z } from "zod";

// Wire snapshot: omts-backend develop@48ae1e0. Not an application session.
export const apiIdSchema = z.guid();
export const apiTextSchema = z.string().regex(/\S/u);
export const subjectTypeSchema = z.enum([
  "SystemAdministrator",
  "CooperativeOwner",
  "Staff",
  "Trader",
]);

export const loginRequestSchema = z.strictObject({
  identifier: apiTextSchema.max(254),
  password: z.string().min(1).max(128),
  clientType: z.literal("Web"),
  deviceName: z.string().optional(),
});

export const authTokensSchema = z.object({
  accessToken: apiTextSchema,
  accessTokenExpiresAt: z.iso.datetime({ offset: true }),
  refreshToken: apiTextSchema,
  refreshTokenExpiresAt: z.iso.datetime({ offset: true }),
  accountId: apiIdSchema,
  displayName: apiTextSchema,
  subjectType: subjectTypeSchema,
  mustChangePassword: z.boolean(),
  phoneVerificationRequired: z.boolean(),
});

export const refreshRequestSchema = z.strictObject({
  refreshToken: apiTextSchema.max(512),
});

export const currentIdentitySchema = z.object({
  accountId: apiIdSchema,
  sessionId: apiIdSchema,
  username: apiTextSchema,
  subjectType: subjectTypeSchema,
});

export type AuthTokensDto = z.infer<typeof authTokensSchema>;
export type CurrentIdentityDto = z.infer<typeof currentIdentitySchema>;
