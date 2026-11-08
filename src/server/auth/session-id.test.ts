import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { createSessionId, hashSessionId } from "@/server/auth/session-id";

describe("server-side BFF SID", () => {
  it("creates a canonical 32-byte random SID and separate deterministic lookup hash", () => {
    const { sid, idHash } = createSessionId();
    expect(sid).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(Buffer.from(sid, "base64url")).toHaveLength(32);
    expect(idHash).toMatch(/^[a-f0-9]{64}$/);
    expect(idHash).not.toBe(sid);
    expect(hashSessionId(sid)).toBe(idHash);
  });

  it("does not reuse identifiers across repeated creation", () => {
    const samples = Array.from({ length: 100 }, createSessionId);
    expect(new Set(samples.map((entry) => entry.sid)).size).toBe(100);
    expect(new Set(samples.map((entry) => entry.idHash)).size).toBe(100);
    // A smoke assertion, not a statistical proof of entropy.
  });

  it.each([undefined, null, 1, {}, "", "a".repeat(42), "a".repeat(44), "+".repeat(43), "A".repeat(42) + "="])(
    "rejects an invalid SID without normalization or echo: %j", (input) => expect(hashSessionId(input)).toBeNull(),
  );

  it("rejects noncanonical padding bits even if Node decodes the same bytes", () => {
    const canonical = "A".repeat(43);
    const alternate = "A".repeat(42) + "B";
    expect(Buffer.from(alternate, "base64url")).toEqual(Buffer.from(canonical, "base64url"));
    expect(hashSessionId(canonical)).not.toBeNull();
    expect(hashSessionId(alternate)).toBeNull();
  });
});
