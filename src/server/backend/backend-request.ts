import "server-only";
import { z } from "zod";

// Resource limits, not business-field validation. Services validate their wire DTOs.
export const MAX_REQUEST_BYTES = 64 * 1024;
const token = z.string().min(1).max(16_384).regex(/^[A-Za-z0-9._~+/-]+=*$/);
const body = z.record(z.string(), z.json());
const requestSchema = z.union([
  z.strictObject({ endpoint: z.literal("login"), body }),
  z.strictObject({ endpoint: z.literal("profileUpdate"), accessToken: token, body }),
  z.strictObject({ endpoint: z.enum(["identity", "permissions", "profileRead", "logout"]), accessToken: token }),
]);

export type BackendRequest = z.infer<typeof requestSchema>;
export type PreparedBackendRequest = Readonly<{
  endpoint: BackendRequest["endpoint"];
  headers: Readonly<Record<string, string>>;
  body?: string;
}>;

export function prepareBackendRequest(input: unknown): PreparedBackendRequest | undefined {
  try {
    const parsed = requestSchema.safeParse(input);
    if (!parsed.success) return undefined;
    const request = parsed.data;
    const headers: Record<string, string> = { Accept: "application/json" };
    if ("accessToken" in request) headers.Authorization = `Bearer ${request.accessToken}`;
    const serialized = "body" in request ? JSON.stringify(request.body) : undefined;
    if (serialized !== undefined) {
      if (Buffer.byteLength(serialized, "utf8") > MAX_REQUEST_BYTES) return undefined;
      headers["Content-Type"] = "application/json";
    }
    return Object.freeze({ endpoint: request.endpoint, headers: Object.freeze(headers), body: serialized });
  } catch {
    // Invalid/cyclic input or getters must not escape with credentials in a cause.
    return undefined;
  }
}
