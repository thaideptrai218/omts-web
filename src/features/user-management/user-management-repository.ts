import { bffFetch } from "@/features/auth/api/bff-fetch";
import type { WorkspaceResult } from "@/features/api-workspace/workspace-repository";
import { accountCredentialSchema, type AccountCredential, type CreateUserRequest } from "./account-credential-contract";

/**
 * Posts a write whose success is a one-time credential. A 5xx, a 401 or a success we could not read leaves the outcome
 * uncertain: the caller must reload the list before trying again, never replay the write.
 */
async function postCredential(path: string, body: unknown): Promise<WorkspaceResult<AccountCredential>> {
  try {
    const response = await bffFetch(path, { method: "POST", credentials: "same-origin", redirect: "error", cache: "no-store", signal: AbortSignal.timeout(30_000),
      headers: { "Content-Type": "application/json", "X-OMTS-Request": "web", Accept: "application/json" }, body: JSON.stringify(body) });
    const value = await response.json();
    if (response.status === 200 && value.status === "success") {
      const parsed = accountCredentialSchema.safeParse(value.data);
      if (parsed.success) return { status: "success", data: parsed.data };
    }
    return { status: "error", httpStatus: response.status, code: typeof value.code === "string" ? value.code : undefined, uncertain: response.status >= 500 || response.ok || response.status === 401 };
  } catch { return { status: "error", httpStatus: 0, uncertain: true }; }
}

/** "Tạo người dùng" / "Sao chép người dùng": one staff account plus its zone-role pairs. */
export const createUserAccount = (request: CreateUserRequest) => postCredential("/api/accounts", request);

/** Owner-only "Đặt lại mật khẩu": ends every session of the account and returns a new temporary password once. */
export const resetAccountPassword = (accountId: string) => postCredential(`/api/accounts/${encodeURIComponent(accountId)}/reset-password`, { confirmed: true });
