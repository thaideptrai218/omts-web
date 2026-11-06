import { z } from "zod";
import { effectivePermissionKeys } from "@/features/access/domain/access-types";
import { functionActions, type PermissionProjection } from "@/features/access/domain/function-permission";
import { apiIdSchema, apiTextSchema, currentIdentitySchema } from "./auth-contract.schemas";

const zoneScope = z.discriminatedUnion("kind", [
  z.strictObject({ kind: z.literal("all-zones") }),
  z.strictObject({ kind: z.literal("zones"), zoneIds: z.array(apiIdSchema).min(1) }),
]);
const navigationScope = z.union([zoneScope, z.strictObject({ kind: z.literal("global") })]);

const permissionProjection = z.strictObject({
  access: z.strictObject({ permissions: z.array(z.strictObject({
    key: z.enum(effectivePermissionKeys), scope: navigationScope,
  })) }),
  functionPermissions: z.array(z.strictObject({
    functionCode: apiTextSchema, action: z.enum(functionActions), scope: zoneScope,
    dataScope: z.enum(["OwnRecords", "AssignedZone"]),
  })),
}) satisfies z.ZodType<PermissionProjection>;

// BFF response, not the .NET token/permissions DTO. No token/sessionId or
// invented display name/organization is accepted into browser session state.
export const bffSessionSchema = z.union([
  z.strictObject({ status: z.literal("authenticated"),
    identity: currentIdentitySchema.omit({ sessionId: true }).strict(), permissions: permissionProjection }),
  z.strictObject({ status: z.literal("anonymous"), clearCookie: z.boolean() }),
  z.strictObject({ status: z.literal("onboarding-required"), phase: z.literal("password-change-required"),
    destination: z.literal("/onboarding/password") }),
  z.strictObject({ status: z.literal("onboarding-required"), phase: z.literal("contact-verification-required"),
    destination: z.literal("/onboarding/contact") }),
  z.strictObject({ status: z.literal("unavailable") }),
]);

export type BffSessionSnapshot = z.infer<typeof bffSessionSchema>;

export function parseBffSessionResponse(httpStatus: number, input: unknown):
  BffSessionSnapshot | Readonly<{ status: "invalid-response" }> {
  const parsed = bffSessionSchema.safeParse(input);
  if (!parsed.success) return { status: "invalid-response" };
  const result = parsed.data;
  const expected = result.status === "authenticated" ? 200 : result.status === "anonymous" ? 401
    : result.status === "onboarding-required" ? 403 : 503;
  return httpStatus === expected ? result : { status: "invalid-response" };
}
