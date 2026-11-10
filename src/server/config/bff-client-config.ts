import "server-only";
import { z } from "zod";

// How the BFF identifies itself to the API and where the end user's address comes from.
// The address is only ever read from a header the deployment itself controls; a header a
// browser can set (the leftmost X-Forwarded-For entry) is never trusted.
const input = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]),
  OMTS_BFF_SHARED_SECRET: z.string().optional(),
  OMTS_WEB_CLIENT_IP_SOURCE: z.enum(["none", "vercel", "real-ip", "forwarded-for"]).optional(),
  OMTS_WEB_TRUSTED_PROXY_HOPS: z.string().regex(/^[1-9]$/).optional(),
});
type Field = "OMTS_BFF_SHARED_SECRET" | "OMTS_WEB_CLIENT_IP_SOURCE" | "OMTS_WEB_TRUSTED_PROXY_HOPS" | "NODE_ENV";

export const MIN_BFF_SECRET_LENGTH = 32;
export type ClientIpSource = Readonly<{ kind: "none" | "vercel" | "real-ip" }>
  | Readonly<{ kind: "forwarded-for"; trustedHops: number }>;
export type BffClientConfig = Readonly<{ secret?: string; ipSource: ClientIpSource }>;
export type BffClientConfigResult = Readonly<{ status: "valid"; config: BffClientConfig }>
  | Readonly<{ status: "invalid-config"; fields: readonly Field[] }>;

export function parseBffClientConfig(environment: Readonly<Record<string, unknown>>): BffClientConfigResult {
  const parsed = input.safeParse(environment);
  if (!parsed.success) {
    const fields = [...new Set(parsed.error.issues.map((issue) => issue.path[0])
      .filter((field): field is Field => typeof field === "string" && Object.hasOwn(input.shape, field)))];
    return { status: "invalid-config", fields };
  }
  const env = parsed.data;
  const fields: Field[] = [];
  const secret = env.OMTS_BFF_SHARED_SECRET === "" ? undefined : env.OMTS_BFF_SHARED_SECRET;
  // The secret travels in a header value: printable ASCII without spaces.
  if (secret !== undefined && (!/^[\x21-\x7e]+$/.test(secret)
    || (env.NODE_ENV !== "development" && secret.length < MIN_BFF_SECRET_LENGTH))) fields.push("OMTS_BFF_SHARED_SECRET");
  const kind = env.OMTS_WEB_CLIENT_IP_SOURCE ?? "none";
  if (kind === "forwarded-for" && env.OMTS_WEB_TRUSTED_PROXY_HOPS === undefined) fields.push("OMTS_WEB_TRUSTED_PROXY_HOPS");
  if (kind !== "forwarded-for" && env.OMTS_WEB_TRUSTED_PROXY_HOPS !== undefined) fields.push("OMTS_WEB_TRUSTED_PROXY_HOPS");
  if (fields.length) return { status: "invalid-config", fields };
  const ipSource: ClientIpSource = kind === "forwarded-for"
    ? { kind, trustedHops: Number(env.OMTS_WEB_TRUSTED_PROXY_HOPS) } : { kind };
  return { status: "valid", config: Object.freeze({ ...(secret === undefined ? {} : { secret }), ipSource }) };
}
