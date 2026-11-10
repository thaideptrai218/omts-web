// Pure JWT payload reader. The signature is NOT verified here: the backend verifies
// every access token on every call. These claims only drive routing decisions
// (is a refresh due, which account does this browser hold) and never grant access.
export type AccessTokenClaims = Readonly<{
  accountId: string;
  sessionId: string;
  subjectType: "SystemAdministrator" | "CooperativeOwner" | "Staff" | "Trader";
  expiresAtMs: number;
}>;

const guid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const subjectTypes = ["SystemAdministrator", "CooperativeOwner", "Staff", "Trader"] as const;
const segment = /^[A-Za-z0-9_-]+$/;
const maxTokenLength = 4096;

export function readAccessTokenClaims(token: unknown): AccessTokenClaims | undefined {
  if (typeof token !== "string" || token.length === 0 || token.length > maxTokenLength) return undefined;
  const parts = token.split(".");
  if (parts.length !== 3 || !parts.every((part) => segment.test(part))) return undefined;
  try {
    const payload: unknown = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8"));
    if (typeof payload !== "object" || payload === null) return undefined;
    const claims = payload as Record<string, unknown>;
    const { sub, sid, subject_type: subjectType, exp } = claims;
    if (typeof sub !== "string" || !guid.test(sub) || typeof sid !== "string" || !guid.test(sid)) return undefined;
    if (typeof exp !== "number" || !Number.isFinite(exp) || exp <= 0) return undefined;
    const subject = subjectTypes.find((value) => value === subjectType);
    if (!subject) return undefined;
    return Object.freeze({ accountId: sub, sessionId: sid, subjectType: subject, expiresAtMs: exp * 1000 });
  } catch { return undefined; }
}
