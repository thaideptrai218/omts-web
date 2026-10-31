import "server-only";
import { apiIdSchema, currentIdentitySchema } from "../../features/auth/api/auth-contract.schemas";
import { mapProfileResponse } from "../../features/profile/api/map-profile-response";
import { mapPermissionsResponse } from "../../features/access/api/map-permissions-response";
import type { PersonalProfile } from "../../features/profile/domain/personal-profile";
import type { PermissionProjection } from "../../features/access/domain/function-permission";
import type { CurrentIdentityDto } from "../../features/auth/api/auth-contract.schemas";

type BrowserProjection<T> = Readonly<{ status: "projected"; dto: T }>
  | Readonly<{ status: "invalid-context" | "invalid-data" | "account-mismatch" | "gated" }>;
export type BrowserIdentityDto = Readonly<Pick<CurrentIdentityDto, "accountId" | "username" | "subjectType">>;

// Preconditions are supplied ONLY by the future trusted DAL. Matching accountId
// prevents cross-account mixing; it does not authenticate/authorize a request.
export function projectIdentityDto(input: unknown, expectedAccountId: string): BrowserProjection<BrowserIdentityDto> {
  try {
    if (!apiIdSchema.safeParse(expectedAccountId).success) return { status: "invalid-context" };
    const parsed = currentIdentitySchema.safeParse(input);
    if (!parsed.success) return { status: "invalid-data" };
    const { accountId, username, subjectType } = parsed.data;
    if (accountId.toLowerCase() !== expectedAccountId.toLowerCase()) return { status: "account-mismatch" };
    // The backend sessionId is not required to display the current identity.
    return { status: "projected", dto: { accountId, username, subjectType } };
  } catch { return { status: "invalid-data" }; }
}

export function projectProfileDto(input: unknown, expectedAccountId: string): BrowserProjection<PersonalProfile> {
  try {
    if (!apiIdSchema.safeParse(expectedAccountId).success) return { status: "invalid-context" };
    const result = mapProfileResponse(input, expectedAccountId);
    if (result.status === "mapped") return { status: "projected", dto: result.profile };
    return { status: result.status === "account-mismatch" ? "account-mismatch" : "invalid-data" };
  } catch { return { status: "invalid-data" }; }
}

export function projectPermissionsDto(input: unknown, expectedAccountId: string): BrowserProjection<PermissionProjection> {
  try {
    if (!apiIdSchema.safeParse(expectedAccountId).success) return { status: "invalid-context" };
    const result = mapPermissionsResponse(input, expectedAccountId);
    if (result.status === "mapped") return { status: "projected", dto: result.projection };
    return { status: result.status === "invalid-permissions" ? "invalid-data" : result.status };
  } catch { return { status: "invalid-data" }; }
}
