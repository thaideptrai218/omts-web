import "server-only";
import { z } from "zod";
import { parseServerWebSessionConfig } from "../config/web-session-config";
import { readMutationBody } from "./csrf-mutation-body";

const method = z.enum(["POST", "PUT", "PATCH", "DELETE"]);
const timeoutMs = z.number().int().min(1).max(60_000);
const policySchema = z.union([
  z.strictObject({ method, body: z.literal("json"), maxBytes: z.number().int().min(1).max(65_536), timeoutMs }),
  z.strictObject({ method, body: z.literal("none"), timeoutMs }),
]);
export type CsrfMutationPolicy = z.infer<typeof policySchema>;
export const CSRF_REQUEST_HEADER = "X-OMTS-Request";
export const CSRF_REQUEST_VALUE = "web";
const invalidPolicy = Object.freeze({ status: "invalid-policy" } as const);
function reject(httpStatus: 400 | 403 | 405) { return Object.freeze({ status: "rejected", httpStatus } as const); }

// No ambient config, CORS response, cookie/store mutation, authorization or fetch.
// This is for mutation Route Handlers, not a general safe-method/Actions guard.
export function createCsrfGuard(environment: Readonly<Record<string, unknown>>) {
  const parsed = parseServerWebSessionConfig(environment);
  if (parsed.status !== "valid") return parsed;
  const origin = parsed.config.origin;
  function checkHeaders(request: Request, expectedMethod: z.infer<typeof method>) {
    try {
      if (!method.safeParse(expectedMethod).success) return invalidPolicy;
      if (!(request instanceof Request)) return reject(400);
      if (request.method !== expectedMethod) return reject(405);
      if (request.headers.get("origin") !== origin
        || request.headers.get(CSRF_REQUEST_HEADER) !== CSRF_REQUEST_VALUE) return reject(403);
      const site = request.headers.get("sec-fetch-site");
      if (site !== null && site !== "same-origin") return reject(403);
      return Object.freeze({ status: "allowed" } as const);
    } catch { return reject(400); }
  }
  const guard = Object.freeze({
    // Upload handlers use the same C2A header policy, then a bounded multipart reader.
    checkHeaders,
    async check(request: Request, input: CsrfMutationPolicy) {
      let policy: CsrfMutationPolicy;
      try {
        const result = policySchema.safeParse(input);
        if (!result.success) return invalidPolicy;
        policy = result.data; // Snapshot server-owned route policy before await.
      } catch { return invalidPolicy; }
      try {
        const headers = checkHeaders(request, policy.method);
        if (headers.status !== "allowed") return headers;
        const body = await readMutationBody(request, policy);
        return body.status === "checked" ? Object.freeze({ status: "allowed", body: body.body } as const) : body;
      } catch {
        // Never surface request input, JSON errors, headers, cookies or cause.
        return reject(400);
      }
    },
  });
  return Object.freeze({ status: "available", guard } as const);
}
