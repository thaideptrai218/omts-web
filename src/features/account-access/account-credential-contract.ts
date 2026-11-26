import { z } from "zod";
import { grantRoleCodes } from "@/features/personal-api/grant-contract";
import { issueEmployeeAccountRequestSchema } from "@/features/employee-api/employee-account-contract";

/** One zone-role pair sent inline with a new account (backend GrantDraft): zoneId null = all zones. */
export const createUserGrantSchema = z.strictObject({ zoneId: z.guid().nullable(), role: z.enum(grantRoleCodes) });
export type CreateUserGrant = z.infer<typeof createUserGrantSchema>;

/** Browser -> BFF body of "Tạo người dùng" and "Sao chép người dùng" (POST /api/accounts). */
export const createUserRequestSchema = z.strictObject({
  displayName: z.string().trim().min(1).max(200),
  username: issueEmployeeAccountRequestSchema.shape.username,
  phoneNumber: z.string().trim().min(1).max(30),
  email: z.string().trim().max(254).nullable(),
  employeeId: z.guid().nullable(),
  grants: z.array(createUserGrantSchema).max(20),
  note: z.string().trim().max(500).nullish(),
});
export type CreateUserRequest = z.infer<typeof createUserRequestSchema>;

/** Reset is an explicit security action: the body must confirm it so a stray POST can never reset a password. */
export const resetPasswordRequestSchema = z.strictObject({ confirmed: z.literal(true) });

/**
 * What the BFF hands back after create or reset: the account identity plus the one-time temporary password.
 * Nothing else of the backend envelope (message copy, row version, pairs) crosses the BFF.
 */
export const accountCredentialSchema = z.strictObject({
  account: z.strictObject({ id: z.guid(), username: z.string(), displayName: z.string() }),
  temporaryPassword: z.string().min(1),
  temporaryPasswordExpiresAt: z.iso.datetime({ offset: true }),
});
export type AccountCredential = z.infer<typeof accountCredentialSchema>;

/** Backend StaffAccountWithPassword, read leniently and projected to {@link accountCredentialSchema}. */
export const backendAccountWithPasswordSchema = z.object({
  account: z.object({ id: z.guid(), username: z.string(), displayName: z.string() }),
  temporaryPassword: z.string().min(1),
  temporaryPasswordExpiresAt: z.iso.datetime({ offset: true }),
});
