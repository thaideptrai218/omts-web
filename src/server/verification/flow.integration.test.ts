import { createSecretKey, randomBytes, randomUUID } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { createRedisIntegrationFixture } from "@/server/auth/__tests__/redis-integration-fixture";
import { createVerificationFlowStore, type OpenFlow } from "./flow-store";
import { runVerification, type VerificationDependencies } from "./flow-service";
import type { VerificationPurpose, VerificationCommand } from "@/features/verification-api/contracts";
import { personalFixture } from "@/features/personal-api/fixtures";
const endpoint = process.env.OMTS_TEST_REDIS_URL;
describe.skipIf(!endpoint)("G2 encrypted flows with live Redis", () => {
  async function setup(purpose: VerificationPurpose = "registration") {
    const fixture = await createRedisIntegrationFixture(endpoint!), secret = createSecretKey(randomBytes(32));
    const store = createVerificationFlowStore(fixture.commands, fixture.namespace, { active: async () => ({ keyId: "qa", key: secret }), byId: async (id) => id === "qa" ? secret : undefined });
    const binding = { contextHash: randomBytes(32).toString("hex"), binding: randomBytes(32).toString("hex"), purpose }, backendId = randomUUID();
    const call = vi.fn<VerificationDependencies["call"]>(async (path) => {
      if (path.endsWith("/verify")) return { status: "success", httpStatus: 200, data: { verificationToken: "private-proof-do-not-return", expiresAt: new Date(Date.now() + 600_000).toISOString() } };
      if (path === "/api/auth/register") return { status: "success", httpStatus: 201, data: { accountId: randomUUID(), username: "trader.qa", oldDocumentsHidden: false, password: randomUUID() } };
      if (path === "/api/auth/recovery") return { status: "success", httpStatus: 202, data: { requestId: backendId, message: "never-return" } };
      if (path === "/api/auth/recovery/reset") return { status: "success", httpStatus: 200, data: { messageCode: "MSG-ACCOUNT-10", message: "never-return" } };
      if (path === "/api/me/contact-changes/confirm") return { status: "success", httpStatus: 200, data: { contact: "qa@example.test", oldDocumentsHidden: false } };
      if (path === "/api/me/profile") return { status: "success", httpStatus: 200, data: { ...personalFixture(), email: "qa@example.test", emailVerified: true } };
      const started = { verificationId: backendId, maskedTarget: "q***@example.test", expiresAt: new Date(Date.now() + 300_000).toISOString(), nextResendAt: new Date(Date.now() + 60_000).toISOString(), sendsLeft: 2 };
      return { status: "success", httpStatus: path.endsWith("/resend") ? 200 : 201, data: purpose === "contact" ? { verification: started, message: "never-return" } : started };
    });
    const deps: VerificationDependencies = { store, binding, call, signal: new AbortController().signal, current: vi.fn(async () => true), rotate: vi.fn(async () => ({ status: "unavailable" as const })), account: { id: personalFixture().accountId, subjectType: personalFixture().subjectType } };
    const run = (command: VerificationCommand) => runVerification(command, deps);
    const start = () => run({ op: "start", purpose, ...(purpose === "password-email" ? {} : { channel: "Email" as const, target: "qa@example.test", ...(purpose === "contact" ? { currentPassword: "private-current-password" } : {}) }) });
    async function proven() { const first = await start(); const id = first.body.flow!.id; const verified = await run({ op: "verify", purpose, id, code: "123456" }); expect(verified.body.flow?.phase).toBe("verified"); return id; }
    async function read() { const result = await store.read(binding); if (result.status !== "found") throw new Error("Missing QA flow"); return result.flow; }
    return { ...fixture, store, binding, call, deps, run, start, proven, read, async cleanup() { await fixture.commands.eval("return redis.call('DEL',KEYS[1])", { keys: [store.key(binding)], arguments: [] }); fixture.close(); } };
  }
  it("keeps proof/target encrypted, projects safe metadata and consumes once", async () => {
    const h = await setup(); try {
      const id = await h.proven(), raw = String(await h.commands.get(h.store.key(h.binding)));
      expect(raw).not.toContain("private-proof"); expect(raw).not.toContain("qa@example.test"); expect(raw).not.toContain("123456");
      expect(JSON.stringify((await h.run({ op: "read", purpose: "registration" })).body)).not.toContain("private-proof");
      const result = await h.run({ op: "complete", purpose: "registration", id, newPassword: "ValidPass123", confirmPassword: "ValidPass123" });
      expect(result.body).toEqual({ status: "completed", username: "trader.qa", oldDocumentsHidden: false }); expect((await h.read()).payload.proof).toBeUndefined();
      expect((await h.run({ op: "complete", purpose: "registration", id, newPassword: "ValidPass123", confirmPassword: "ValidPass123" })).httpStatus).toBe(409);
      expect(h.call.mock.calls.filter(([path]) => path === "/api/auth/register")).toHaveLength(1);
    } finally { await h.cleanup(); }
  });
  it("binds flows to context/session generation and purpose and authenticates ciphertext", async () => {
    const h = await setup(); try {
      await h.proven(); expect((await h.store.read({ ...h.binding, binding: randomBytes(32).toString("hex") })).status).toBe("missing"); expect((await h.store.read({ ...h.binding, contextHash: randomBytes(32).toString("hex") })).status).toBe("missing");
      const raw = String(await h.commands.get(h.store.key(h.binding)));
      await h.commands.eval("return redis.call('SET',KEYS[1],ARGV[1],'PX',60000)", { keys: [h.store.key({ ...h.binding, purpose: "recovery" })], arguments: [raw] });
      expect((await h.store.read({ ...h.binding, purpose: "recovery" })).status).toBe("unavailable");
      const record = JSON.parse(raw); record.sealed = `${record.sealed[0] === "A" ? "B" : "A"}${record.sealed.slice(1)}`;
      await h.commands.eval("return redis.call('SET',KEYS[1],ARGV[1],'PX',60000)", { keys: [h.store.key(h.binding)], arguments: [JSON.stringify(record)] });
      expect((await h.store.read(h.binding)).status).toBe("unavailable");
      await h.commands.eval("return redis.call('DEL',KEYS[1])", { keys: [h.store.key({ ...h.binding, purpose: "recovery" })], arguments: [] });
    } finally { await h.cleanup(); }
  });
  it("serializes parallel verify requests and never counts two entries", async () => {
    const h = await setup(); try {
      const id = (await h.start()).body.flow!.id;
      const results = await Promise.all(Array.from({ length: 5 }, () => h.run({ op: "verify", purpose: "registration", id, code: "123456" })));
      expect(results.filter((r) => r.body.flow?.phase === "verified")).toHaveLength(1); expect(h.call.mock.calls.filter(([p]) => p.endsWith("/verify"))).toHaveLength(1);
    } finally { await h.cleanup(); }
  });
  it("does not revive an expired/missing row through a reserved handle", async () => {
    const h = await setup(); try {
      await h.proven(); const flow = await h.read(); const reserved = await h.store.reserve(h.binding, flow, ["verified"]); expect(reserved.status).toBe("found");
      await h.commands.eval("return redis.call('DEL',KEYS[1])", { keys: [h.store.key(h.binding)], arguments: [] });
      expect((await h.store.settle(h.binding, reserved.status === "found" ? reserved.flow : flow, "verified", flow.payload)).status).toBe("missing"); expect((await h.store.read(h.binding)).status).toBe("missing");
    } finally { await h.cleanup(); }
  });
  it("keeps unknown verification non-replayable and discards proof", async () => {
    const h = await setup(); try {
      const id = (await h.start()).body.flow!.id; h.call.mockRejectedValueOnce(new Error("private backend failure"));
      expect((await h.run({ op: "verify", purpose: "registration", id, code: "123456" })).body.uncertain).toBe(true);
      expect((await h.read()).record.phase).toBe("unknown"); const count = h.call.mock.calls.length;
      expect((await h.run({ op: "verify", purpose: "registration", id, code: "123456" })).httpStatus).toBe(409); expect(h.call).toHaveBeenCalledTimes(count);
      expect((await h.run({ op: "read", purpose: "registration" })).body.flow?.phase).toBe("unknown");
    } finally { await h.cleanup(); }
  });
  it("does not publish proof when logout/context change wins after the backend call", async () => {
    const h = await setup(); try {
      const id = (await h.start()).body.flow!.id; let current = true; h.deps.current = async () => current;
      h.call.mockImplementationOnce(async () => { current = false; return { status: "success", httpStatus: 200, data: { verificationToken: "private-proof", expiresAt: new Date(Date.now() + 600_000).toISOString() } }; });
      const result = await h.run({ op: "verify", purpose: "registration", id, code: "123456" }); expect(result.httpStatus).toBe(503); expect((await h.read()).payload.proof).toBeUndefined();
    } finally { await h.cleanup(); }
  });
  it("keeps wrong-code attempts retryable but never persists the submitted OTP", async () => {
    const h = await setup(); try {
      const id = (await h.start()).body.flow!.id; h.call.mockResolvedValueOnce({ status: "http-error", httpStatus: 400, code: "MSG-ACCOUNT-16" });
      expect((await h.run({ op: "verify", purpose: "registration", id, code: "654321" })).body).toMatchObject({ status: "error", code: "MSG-ACCOUNT-16", uncertain: false });
      expect((await h.read()).record.phase).toBe("code"); expect(String(await h.commands.get(h.store.key(h.binding)))).not.toContain("654321");
    } finally { await h.cleanup(); }
  });
  it("recovery uses the generic start contract for resend without exposing backend IDs", async () => {
    const h = await setup("recovery"); try {
      const first = await h.start(); expect(first.body.flow?.sendsLeft).toBeNull(); expect(JSON.stringify(first.body)).not.toContain("requestId"); expect(JSON.stringify(first.body)).not.toContain("never-return");
      expect((await h.run({ op: "resend", purpose: "recovery", id: first.body.flow!.id })).httpStatus).toBe(429);
      // Advance only this QA record's resend deadline via the store, retaining proof/context boundaries.
      const flow = await h.read(), lease = await h.store.reserve(h.binding, flow, ["code"]); expect(lease.status).toBe("found");
      await h.store.settle(h.binding, (lease as { status: "found"; flow: OpenFlow }).flow, "code", { ...flow.payload, nextResendAt: Date.now() - 1 });
      await h.run({ op: "resend", purpose: "recovery", id: first.body.flow!.id });
      expect(h.call.mock.calls.map(([p]) => p)).toEqual(["/api/auth/recovery", "/api/auth/recovery"]);
    } finally { await h.cleanup(); }
  });
  it("contact verification waits for explicit complete, and cancel changes no contact", async () => {
    const h = await setup("contact"); try {
      const id = await h.proven(); expect(h.call.mock.calls.some(([p]) => p.endsWith("/confirm"))).toBe(false);
      expect(String(await h.commands.get(h.store.key(h.binding)))).not.toContain("private-current-password");
      expect((await h.run({ op: "cancel", purpose: "contact", id })).body.status).toBe("cancelled"); expect(h.call.mock.calls.some(([p]) => p.endsWith("/confirm"))).toBe(false);
    } finally { await h.cleanup(); }
  });
  it("contact complete returns a fresh own profile and blocks replay", async () => {
    const h = await setup("contact"); try {
      const id = await h.proven(), result = await h.run({ op: "complete", purpose: "contact", id }); expect(result.body.profile?.email).toBe("qa@example.test"); expect(result.body.profile?.emailVerified).toBe(true);
      expect((await h.run({ op: "complete", purpose: "contact", id })).httpStatus).toBe(409);
    } finally { await h.cleanup(); }
  });
  it("reports a known saved contact even if its fresh profile cannot be read", async () => {
    const h = await setup("contact"); try {
      const id = await h.proven(); h.call.mockResolvedValueOnce({ status: "success", httpStatus: 200, data: { contact: "qa@example.test", oldDocumentsHidden: false } }).mockResolvedValueOnce({ status: "http-error", httpStatus: 503 });
      const result = await h.run({ op: "complete", purpose: "contact", id }); expect(result.body).toEqual({ status: "completed", oldDocumentsHidden: false, profile: null }); expect((await h.read()).record.phase).toBe("done");
    } finally { await h.cleanup(); }
  });
  it("uses G1 rotation for an email password proof and never returns its tokens", async () => {
    const h = await setup("password-email"); try {
      const id = await h.proven(); const rotate = vi.fn(async () => ({ status: "created" as const, destination: "/dashboard", cookie: { readForResponseHeader: () => "private-cookie" } })); h.deps.rotate = rotate;
      const result = await h.run({ op: "complete", purpose: "password-email", id, newPassword: "ValidPass123", confirmPassword: "ValidPass123" });
      expect(rotate).toHaveBeenCalledWith({ newPassword: "ValidPass123", confirmPassword: "ValidPass123" }, "private-proof-do-not-return");
      expect(result.body).toEqual({ status: "completed", destination: "/dashboard" }); expect((await h.read()).payload.proof).toBeUndefined();
    } finally { await h.cleanup(); }
  });
});
