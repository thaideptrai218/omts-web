import "server-only";
import { z } from "zod";
import { resetPasswordRequestSchema } from "@/features/user-management/account-credential-contract";
import { forwardOwnerCredentialPost } from "./account-credential-http";

const accountIdSchema = z.guid();

/**
 * Owner issues a new temporary password: POST /api/accounts/{id}/reset-password. The backend ends every session of that
 * account and returns the password once (MSG-ACCOUNT-23). The account id comes from the route, never from the body.
 */
export async function handleAccountResetPassword(request: Request, accountId: string) {
  const id = accountIdSchema.safeParse(accountId);
  if (!id.success) return Response.json({ status: "invalid-input", code: "MSG01" }, { status: 400, headers: { "Cache-Control": "private, no-store" } });
  return forwardOwnerCredentialPost(request, {
    bodySchema: resetPasswordRequestSchema,
    forward: () => ({ path: `/api/accounts/${id.data}/reset-password` }),
    successStatus: 200,
  });
}
