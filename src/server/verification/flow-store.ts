import "server-only";
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { z } from "zod";
import { verificationPurposeSchema } from "@/features/verification-api/contracts";
import { isSessionEncryptionKey, type SessionKeyProvider } from "@/server/auth/session-token-keys";

export const startedSchema = z.object({ verificationId: z.guid(), maskedTarget: z.string().min(1).max(300), expiresAt: z.iso.datetime({ offset: true }), sendsLeft: z.number().int().min(0).max(2), nextResendAt: z.iso.datetime({ offset: true }) });
export const flowPayloadSchema = z.strictObject({ target: z.string().max(254).optional(), channel: z.enum(["Email", "Sms"]).optional(), backendId: z.guid().optional(),
  maskedTarget: z.string().max(300), nextResendAt: z.number().int().nullable(), sendsLeft: z.number().int().min(0).max(2).nullable(), proof: z.string().min(1).max(1024).optional() });
export type FlowPayload = z.infer<typeof flowPayloadSchema>;

// The whole flow lives in one sealed cookie. Only two states exist: waiting for the code, or code
// accepted and a proof held. The API is the only authority on codes and tokens: each is single use there.
const flowSchema = z.strictObject({ id: z.uuid(), purpose: verificationPurposeSchema, phase: z.enum(["code", "verified"]), expiresAt: z.number().int().nonnegative(), payload: flowPayloadSchema });
export type OpenFlow = z.infer<typeof flowSchema>;
// `binding` names who may open the cookie: the API session id and account when signed in, a constant for
// anonymous flows. It is authenticated data of the ciphertext and is never stored in the cookie.
export type FlowBinding = { binding: string; purpose: z.infer<typeof verificationPurposeSchema> };
export type FlowRead = { status: "found"; flow: OpenFlow } | { status: "missing" };

const VERSION = "v1";
const MAX_COOKIE_VALUE_LENGTH = 3800;
const keyIdPattern = /^[A-Za-z0-9_-]{1,64}$/;
const segmentPattern = /^[A-Za-z0-9_-]+$/;
const aad = (binding: FlowBinding) => Buffer.from(JSON.stringify(["omts-verification-flow", 1, binding.purpose, binding.binding]));
const missing: FlowRead = Object.freeze({ status: "missing" });

export function createVerificationFlowStore(keys: SessionKeyProvider, clock: () => number = Date.now) {
  return Object.freeze({
    // A missing, expired, tampered, foreign-purpose or foreign-session cookie gives the same answer: no flow.
    async open(binding: FlowBinding, value: string | undefined): Promise<FlowRead> {
      if (!value) return missing;
      try {
        const parts = value.split(".");
        if (parts.length !== 4 || parts[0] !== VERSION || !keyIdPattern.test(parts[1]) || !segmentPattern.test(parts[2]) || !segmentPattern.test(parts[3])) return missing;
        const secret = await keys.byId(parts[1]);
        if (!isSessionEncryptionKey(secret)) return missing;
        const iv = Buffer.from(parts[2], "base64url"), sealed = Buffer.from(parts[3], "base64url");
        if (iv.length !== 12 || sealed.length <= 16) return missing;
        const decipher = createDecipheriv("aes-256-gcm", secret, iv);
        decipher.setAuthTag(sealed.subarray(sealed.length - 16));
        decipher.setAAD(aad(binding));
        const plain = Buffer.concat([decipher.update(sealed.subarray(0, sealed.length - 16)), decipher.final()]);
        try {
          const parsed = flowSchema.safeParse(JSON.parse(plain.toString("utf8")));
          if (!parsed.success || parsed.data.purpose !== binding.purpose || parsed.data.expiresAt <= clock()) return missing;
          return { status: "found", flow: parsed.data };
        } finally { plain.fill(0); }
      } catch { return missing; }
    },
    // The cookie value, or undefined when the flow cannot be stored.
    async seal(binding: FlowBinding, flow: OpenFlow): Promise<string | undefined> {
      try {
        const value = flowSchema.parse(flow);
        if (value.purpose !== binding.purpose) return undefined;
        const active = await keys.active();
        if (!isSessionEncryptionKey(active.key) || !keyIdPattern.test(active.keyId)) return undefined;
        const plaintext = Buffer.from(JSON.stringify(value));
        try {
          const iv = randomBytes(12), cipher = createCipheriv("aes-256-gcm", active.key, iv);
          cipher.setAAD(aad(binding));
          const sealed = Buffer.concat([cipher.update(plaintext), cipher.final(), cipher.getAuthTag()]);
          const cookie = [VERSION, active.keyId, iv.toString("base64url"), sealed.toString("base64url")].join(".");
          return cookie.length <= MAX_COOKIE_VALUE_LENGTH ? cookie : undefined;
        } finally { plaintext.fill(0); }
      } catch { return undefined; }
    },
  });
}
export type VerificationFlowStore = ReturnType<typeof createVerificationFlowStore>;
