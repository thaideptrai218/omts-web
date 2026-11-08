import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { checkAccessBoundExpiry, deriveAccessBoundExpiry } from "./session-expiry";
import type { SessionClock } from "./session-store";

const now = Date.UTC(2026, 9, 24, 8);
const iso = (time: number) => new Date(time).toISOString();
const wire = (access = now + 1000, refresh = now + 60_000) => ({ accessTokenExpiresAt: iso(access), refreshTokenExpiresAt: iso(refresh) });
const stored = (expires = now + 1000) => ({ accessExpiresAtMs: now + 2000, refreshExpiresAtMs: now + 60_000, expiresAtMs: expires });

describe("C3A absolute access-bound expiry derivation", () => {
  it.each([[1000, 60_000], [60_000, 1000], [1000, 1000]])("takes the earlier backend boundary: %i/%i", (access, refresh) => {
    expect(deriveAccessBoundExpiry(wire(now + access, now + refresh), () => now)).toEqual({
      status: "active", accessExpiresAtMs: now + access, refreshExpiresAtMs: now + refresh, expiresAtMs: now + Math.min(access, refresh),
    });
  });
  it.each([-1, 0, 1])("treats access expiry relative to now %i precisely", (delta) => {
    expect(deriveAccessBoundExpiry(wire(now + delta), () => now).status).toBe(delta > 0 ? "active" : "expired");
  });
  it.each([-1, 0, 1])("treats refresh expiry relative to now %i precisely", (delta) => {
    expect(deriveAccessBoundExpiry(wire(now + 60_000, now + delta), () => now).status).toBe(delta > 0 ? "active" : "expired");
  });
  it.each(["2026-10-24T08:00:01Z", "2026-10-24T08:00:01.0Z", "2026-10-24T15:00:01+07:00",
    "2026-10-24T03:00:01-05:00", "2026-10-24T08:00:01.0000000+00:00"])(
    "converts equivalent explicit-zone timestamps without local timezone: %s", (accessTokenExpiresAt) => {
      expect(deriveAccessBoundExpiry({ ...wire(), accessTokenExpiresAt }, () => now)).toMatchObject({ status: "active", expiresAtMs: now + 1000 });
    },
  );
  it.each([["1", 100], ["12", 120], ["123", 123], ["1234567", 123], ["9999999", 999]])(
    "truncates/pads fraction %s conservatively to %i ms", (fraction, milliseconds) => {
      expect(deriveAccessBoundExpiry({ ...wire(), accessTokenExpiresAt: `2026-10-24T08:00:01.${fraction}Z` }, () => now))
        .toMatchObject({ status: "active", expiresAtMs: now + 1000 + milliseconds });
    },
  );
  it("does not round a sub-ms expiry into a later valid instant", () => {
    expect(deriveAccessBoundExpiry({ ...wire(), accessTokenExpiresAt: "2026-10-24T08:00:00.0009999Z" }, () => now))
      .toEqual({ status: "expired" });
  });
  it.each([undefined, null, {}, [], "fake-secret", { accessTokenExpiresAt: iso(now + 1) },
    { accessTokenExpiresAt: now + 1, refreshTokenExpiresAt: now + 1000 }])("refuses missing/non-wire timestamps %#", (input) => {
      expect(deriveAccessBoundExpiry(input, () => now)).toEqual({ status: "invalid-input" });
    });
  it.each(["", "not-a-date-fake-secret", "2026-10-24", "2026-10-24T08:01:00", "2026-10-24T08:01Z",
    "2026-02-29T08:00:01Z", "2026-04-31T08:00:01Z", "2026-13-01T08:00:01Z", "2026-10-24T24:00:00Z",
    "2026-10-24T08:00:60Z", "2026-10-24T08:00:01+24:00", "2026-10-24T08:00:01Z\n",
    " 2026-10-24T08:00:01Z", "2026-10-24T08:00:01Z ", "2026-10-24T08:00:01z",
    "1969-12-31T23:59:59Z", `2026-10-24T08:00:01.${"1".repeat(65)}Z`])(
    "refuses invalid/ambiguous/unrepresentable dates without normalization: %s", (value) => {
      expect(deriveAccessBoundExpiry({ ...wire(), accessTokenExpiresAt: value }, () => now)).toEqual({ status: "invalid-input" });
      expect(deriveAccessBoundExpiry({ ...wire(), refreshTokenExpiresAt: value }, () => now)).toEqual({ status: "invalid-input" });
    },
  );
  it("accepts a valid leap day and the epoch without adding a default duration", () => {
    expect(deriveAccessBoundExpiry({ accessTokenExpiresAt: "2028-02-29T00:00:00Z", refreshTokenExpiresAt: "2028-03-01T00:00:00Z" }, () => now).status).toBe("active");
    expect(deriveAccessBoundExpiry({ accessTokenExpiresAt: "1970-01-01T00:00:00Z", refreshTokenExpiresAt: "1970-01-01T00:00:01Z" }, () => 0))
      .toEqual({ status: "expired" });
  });
});

describe("C3A stored absolute boundary recheck", () => {
  it("keeps a stricter existing cap, not the later token cap", () => {
    expect(checkAccessBoundExpiry(stored(), () => now)).toEqual({ status: "active", ...stored() });
  });
  it.each([-1, 0, 1])("checks exact stored expiry relative to now: %i", (delta) => {
    expect(checkAccessBoundExpiry(stored(now + delta), () => now).status).toBe(delta > 0 ? "active" : "expired");
  });
  it.each([
    { ...stored(), expiresAtMs: now + 2001 },
    { ...stored(), refreshExpiresAtMs: now + 999 },
  ])("refuses cap-violating records instead of migrating/extending them %#", (input) => {
    expect(checkAccessBoundExpiry(input, () => now)).toEqual({ status: "invalid-input" });
  });
  it.each([undefined, null, {}, { status: "unavailable" }, { ...stored(), expiresAtMs: "fake-secret" },
    { ...stored(), accessExpiresAtMs: NaN }, { ...stored(), refreshExpiresAtMs: Infinity },
    { ...stored(), expiresAtMs: -1 }, { ...stored(), expiresAtMs: 0.5 },
    { ...stored(), expiresAtMs: 8_640_000_000_000_001 }])("rejects invalid lifetime input without claiming expiry %#", (input) => {
      expect(checkAccessBoundExpiry(input, () => now)).toEqual({ status: "invalid-input" });
    });
  it.each([NaN, Infinity, -1, 0.5, 8_640_000_000_000_001, "fake-secret", undefined])(
    "keeps clock failure distinct from known expiry: %s", (value) => {
      const clock = (() => value) as SessionClock;
      expect(deriveAccessBoundExpiry(wire(), clock)).toEqual({ status: "unavailable" });
      expect(checkAccessBoundExpiry(stored(), clock)).toEqual({ status: "unavailable" });
    },
  );
  it("redacts throwing clocks and input getters, without reading irrelevant credential getters", () => {
    const clock = () => { throw new Error("fake-clock-secret"); };
    expect(checkAccessBoundExpiry(stored(), clock)).toEqual({ status: "unavailable" });
    expect(deriveAccessBoundExpiry(wire(), clock)).toEqual({ status: "unavailable" });
    expect(deriveAccessBoundExpiry({ get accessTokenExpiresAt() { throw new Error("fake-input-secret"); } }, () => now)).toEqual({ status: "invalid-input" });
    const input = { ...wire(), get accessToken() { throw new Error("fake-credential-secret"); } };
    expect(deriveAccessBoundExpiry(input, () => now).status).toBe("active");
  });
  it("takes one explicit clock snapshot and never falls back to Date.now", () => {
    const ambient = vi.spyOn(Date, "now").mockImplementation(() => { throw new Error("Unexpected ambient clock"); });
    try {
      const clock = vi.fn(() => now);
      const result = deriveAccessBoundExpiry(wire(), clock);
      expect(result.status).toBe("active");
      expect(clock).toHaveBeenCalledTimes(1);
      expect(ambient).not.toHaveBeenCalled();
      expect(checkAccessBoundExpiry(stored(), undefined as unknown as SessionClock)).toEqual({ status: "unavailable" });
      expect(Object.isFrozen(result)).toBe(true);
    } finally { ambient.mockRestore(); }
  });
  it("does not claim known expiry when the current server time is unavailable", () => {
    expect(deriveAccessBoundExpiry(wire(0, 1000), () => NaN)).toEqual({ status: "unavailable" });
    expect(checkAccessBoundExpiry({ accessExpiresAtMs: 0, refreshExpiresAtMs: 1000, expiresAtMs: 0 }, () => NaN))
      .toEqual({ status: "unavailable" });
  });
  it("snapshots only stored times and never echoes a failing stored-field getter", () => {
    const input = { ...stored(), protectedTokens: { sealed: "fake-secret" } };
    const result = checkAccessBoundExpiry(input, () => now);
    input.expiresAtMs += 100_000;
    expect(result).toEqual({ status: "active", ...stored() });
    expect(JSON.stringify(result)).not.toContain("secret");
    expect(checkAccessBoundExpiry({ get expiresAtMs() { throw new Error("fake-stored-secret"); } }, () => now))
      .toEqual({ status: "invalid-input" });
  });
});
