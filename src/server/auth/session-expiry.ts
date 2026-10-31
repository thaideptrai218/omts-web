import "server-only";
import { z } from "zod";
import type { SessionClock } from "./session-store";
import { readSessionClock, sessionValuesSchema } from "./session-store-validation";

const timestamp = sessionValuesSchema.shape.expiresAtMs;
const instant = z.iso.datetime({ offset: true }).max(64).refine((value) => !/\s/u.test(value));
const wireExpiry = z.object({ accessTokenExpiresAt: instant, refreshTokenExpiresAt: instant });
// Pick only times: a full store/token object is not a public DTO or required input.
const lifetime = z.object({ accessExpiresAtMs: timestamp, refreshExpiresAtMs: timestamp, expiresAtMs: timestamp });
type Lifetime = z.infer<typeof lifetime>;
type ExpiryResult = Readonly<{ status: "active" } & Lifetime>
  | Readonly<{ status: "expired" | "invalid-input" | "unavailable" }>;
const invalid: ExpiryResult = Object.freeze({ status: "invalid-input" });
const unavailable: ExpiryResult = Object.freeze({ status: "unavailable" });
const expired: ExpiryResult = Object.freeze({ status: "expired" });

function epochMilliseconds(value: string): number | undefined {
  // .NET can emit sub-ms precision. Convert to standardized three-digit ms by
  // truncation, never rounding an expiry later or relying on a permissive parser.
  const normalized = value.replace(/\.(\d+)(?=Z|[+-]\d{2}:\d{2}$)/,
    (_, digits: string) => "." + digits.padEnd(3, "0").slice(0, 3));
  const parsed = timestamp.safeParse(Date.parse(normalized));
  return parsed.success ? parsed.data : undefined;
}

function assess(values: Lifetime, clock: SessionClock): ExpiryResult {
  // Fail closed on a record that violates C3A; do not silently migrate/extend it.
  if (values.expiresAtMs > Math.min(values.accessExpiresAtMs, values.refreshExpiresAtMs)) return invalid;
  const now = readSessionClock(clock);
  if (now === undefined) return unavailable;
  return values.expiresAtMs <= now ? expired : Object.freeze({ status: "active", ...values });
}

// Only explicit backend expiry metadata + a trusted server clock. No duration
// defaults, JWT decode, skew/grace, idle policy, Date.now, store writes or refresh.
export function deriveAccessBoundExpiry(input: unknown, clock: SessionClock): ExpiryResult {
  try {
    const parsed = wireExpiry.safeParse(input);
    if (!parsed.success) return invalid;
    const accessExpiresAtMs = epochMilliseconds(parsed.data.accessTokenExpiresAt);
    const refreshExpiresAtMs = epochMilliseconds(parsed.data.refreshTokenExpiresAt);
    if (accessExpiresAtMs === undefined || refreshExpiresAtMs === undefined) return invalid;
    return assess({ accessExpiresAtMs, refreshExpiresAtMs, expiresAtMs: Math.min(accessExpiresAtMs, refreshExpiresAtMs) }, clock);
  } catch { return invalid; }
}

// Recheck the stored absolute boundary, including any stricter existing cap.
// This does not read Redis, interpret missing/revoked/unavailable, or mutate TTL.
export function checkAccessBoundExpiry(input: unknown, clock: SessionClock): ExpiryResult {
  try {
    const parsed = lifetime.safeParse(input);
    return parsed.success ? assess(parsed.data, clock) : invalid;
  } catch { return invalid; }
}
