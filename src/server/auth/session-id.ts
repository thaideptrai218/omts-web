import "server-only";
import { createHash, randomBytes } from "node:crypto";

export function hashSessionId(input: unknown): string | null {
  if (typeof input !== "string" || !/^[A-Za-z0-9_-]{43}$/.test(input)) return null;
  const bytes = Buffer.from(input, "base64url");
  if (bytes.length !== 32 || bytes.toString("base64url") !== input) return null;
  return createHash("sha256").update("omts-bff-sid:v1:").update(bytes).digest("hex");
}

export function createSessionId(): Readonly<{ sid: string; idHash: string }> {
  try {
    const sid = randomBytes(32).toString("base64url");
    const idHash = hashSessionId(sid);
    if (idHash) return { sid, idHash };
  } catch {
    // Never replace failed cryptographic randomness with Math.random or a timestamp.
  }
  throw new Error("BFF session ID generation unavailable.");
}
