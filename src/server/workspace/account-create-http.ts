import "server-only";
import { createUserRequestSchema } from "@/features/account-access/account-credential-contract";
import { forwardOwnerCredentialPost } from "./account-credential-http";

/**
 * Owner creates a staff account with its zone-role pairs inline: POST /api/accounts with Grants[] (backend GrantDraft:
 * ZoneId null = all zones, Role = fixed role code). Only Staff accounts can be created, so no subject type is forwarded.
 */
export const handleAccountCreate = (request: Request) => forwardOwnerCredentialPost(request, {
  bodySchema: createUserRequestSchema,
  forward: ({ displayName, username, phoneNumber, email, employeeId, grants, note }) => ({
    path: "/api/accounts",
    payload: { displayName, username, phoneNumber, email: email || null, employeeId, grants: grants.map(({ zoneId, role }) => ({ zoneId, role })), note: note || null },
  }),
  successStatus: 201,
});
