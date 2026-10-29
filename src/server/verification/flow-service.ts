import "server-only";
import { z } from "zod";
import type { VerificationCommand, VerificationResult, VerificationView } from "@/features/verification-api/contracts";
import { profileViewSchema } from "@/features/profile/api/profile-contract.schemas";
import type { BackendTransportResult } from "@/server/backend/backend-result";
import type { AuthActionResult } from "@/server/auth/api-session-runtime";
import { startedSchema, type FlowBinding, type FlowPayload, type OpenFlow, type VerificationFlowStore } from "./flow-store";
export type VerificationReply = { body: VerificationResult; httpStatus: number; auth?: AuthActionResult };
export type VerificationDependencies = {
  store: VerificationFlowStore; binding: FlowBinding; signal: AbortSignal;
  current(): Promise<boolean>;
  call(path: string, body?: unknown): Promise<BackendTransportResult>;
  rotate(input: { newPassword: string; confirmPassword: string }, proof: string): Promise<AuthActionResult>;
  account?: { id: string; subjectType: string };
};
const fail = (httpStatus = 503, code?: string, uncertain = true): VerificationReply => ({ body: { status: "error", code, uncertain }, httpStatus });
function view(flow: OpenFlow): VerificationView {
  const { record: r, payload: p } = flow;
  return { id: r.id, purpose: r.purpose, phase: r.phase, channel: p.channel ?? null, maskedTarget: p.maskedTarget, expiresAt: new Date(r.expiresAt).toISOString(),
    nextResendAt: p.nextResendAt === null ? null : new Date(p.nextResendAt).toISOString(), sendsLeft: p.sendsLeft };
}
function mask(target = "") {
  const at = target.indexOf("@"); return at > 0 ? `${target.slice(0, 1)}***${target.slice(at)}` : `***${target.slice(-3)}`;
}
export async function runVerification(command: VerificationCommand, deps: VerificationDependencies): Promise<VerificationReply> {
  const { store, binding, signal } = deps;
  let reserved: OpenFlow | undefined;
  async function publish(phase: OpenFlow["record"]["phase"], payload: FlowPayload, expiresAt?: number) {
    if (!reserved) return undefined;
    const result = await store.settle(binding, reserved, phase, payload, expiresAt);
    return result.status === "found" ? result.flow : undefined;
  }
  async function unknown() {
    if (reserved) await publish("unknown", { ...reserved.payload, proof: undefined });
    return fail();
  }
  try {
    if (signal.aborted || !await deps.current()) return fail(409, undefined, false);
    if (command.op === "start") {
      const begun = await store.start(binding, { target: command.target, channel: command.channel, maskedTarget: mask(command.target), nextResendAt: null, sendsLeft: null });
      if (begun.status !== "found") return fail(begun.status === "conflict" ? 409 : 503, undefined, begun.status !== "conflict");
      reserved = begun.flow;
    } else {
      const existing = await store.read(binding);
      if (existing.status === "missing") return command.op === "read" ? { body: { status: "empty" }, httpStatus: 200 } : fail(410, "MSG16", false);
      if (existing.status !== "found") return fail();
      const flow = existing.flow;
      if (command.op === "read") return await deps.current() && !signal.aborted ? { body: { status: "success", flow: view(flow) }, httpStatus: 200 } : fail(409, undefined, false);
      if (flow.record.id !== command.id) return fail(409, undefined, false);
      if (command.op === "cancel") {
        const cancelled = await store.cancel(binding, flow);
        return cancelled.status === "cancelled" ? { body: { status: "cancelled" }, httpStatus: 200 } : fail(409, undefined, false);
      }
      if (command.op === "resend" && flow.payload.nextResendAt && flow.payload.nextResendAt > Date.now()) return { body: { status: "error", code: "TOO_MANY_REQUESTS", uncertain: false, retryAfterMs: Math.min(3_600_000, flow.payload.nextResendAt - Date.now()) }, httpStatus: 429 };
      const leased = await store.reserve(binding, flow, command.op === "complete" ? ["verified"] : ["code"]);
      if (leased.status !== "found") return fail(leased.status === "conflict" ? 409 : 503, undefined, leased.status !== "conflict");
      reserved = leased.flow;
    }
    if (signal.aborted || !await deps.current()) return unknown();
    const payload = reserved.payload, purpose = binding.purpose;
    let response: BackendTransportResult;
    if (command.op === "complete") {
      if (!payload.proof) return unknown();
      if (purpose === "password-email") {
        const auth = await deps.rotate({ newPassword: command.newPassword!, confirmPassword: command.confirmPassword! }, payload.proof);
        const settled = await publish(auth.status === "created" ? "done" : auth.status === "rejected" ? "failed" : "unknown", { ...payload, proof: undefined });
        if (!settled || signal.aborted) return fail();
        if (auth.status === "created") return { body: { status: "completed", destination: auth.destination as VerificationResult["destination"] }, httpStatus: 200, auth };
        return auth.status === "rejected" ? fail(auth.httpStatus, auth.code, false) : fail();
      }
      const path = purpose === "registration" ? "/api/auth/register" : purpose === "recovery" ? "/api/auth/recovery/reset" : "/api/me/contact-changes/confirm";
      const body = purpose === "registration" ? { channel: payload.channel, identifier: payload.target, password: command.newPassword, passwordConfirmation: command.confirmPassword, verificationToken: payload.proof }
        : purpose === "recovery" ? { verificationToken: payload.proof, newPassword: command.newPassword, passwordConfirmation: command.confirmPassword } : { verificationToken: payload.proof };
      response = await deps.call(path, body);
      if (!await deps.current() || signal.aborted) return unknown();
      if (response.status === "http-error" && response.httpStatus < 500) {
        if (!await publish("failed", { ...payload, proof: undefined })) return fail();
        return fail(response.httpStatus, response.code, false);
      }
      if (response.status !== "success" || response.httpStatus !== (purpose === "registration" ? 201 : 200)) return unknown();
      let result: VerificationResult = { status: "completed" };
      if (purpose === "registration") {
        const account = z.object({ accountId: z.guid(), username: z.string().min(1).max(254), oldDocumentsHidden: z.boolean() }).safeParse(response.data);
        if (!account.success) return unknown(); result = { ...result, username: account.data.username, oldDocumentsHidden: account.data.oldDocumentsHidden };
      } else if (purpose === "contact") {
        const contact = z.object({ contact: z.string().min(1).max(254), oldDocumentsHidden: z.boolean() }).safeParse(response.data);
        if (!contact.success) return unknown();
        let profileResponse: BackendTransportResult;
        try { profileResponse = await deps.call("/api/me/profile"); } catch { profileResponse = { status: "unavailable" }; }
        if (!await deps.current() || signal.aborted) return unknown();
        const profile = profileResponse.status === "success" && profileResponse.httpStatus === 200 ? profileViewSchema.safeParse(profileResponse.data) : undefined;
        const matching = profile?.success && profile.data.accountId === deps.account?.id && profile.data.subjectType === deps.account.subjectType
          && (payload.channel === "Email" ? profile.data.email === contact.data.contact && profile.data.emailVerified : profile.data.phoneNumber === contact.data.contact && profile.data.phoneVerified);
        result = { ...result, oldDocumentsHidden: contact.data.oldDocumentsHidden, profile: matching ? profile.data : null };
      } else if (!z.object({}).safeParse(response.data).success) return unknown();
      if (!await publish("done", { ...payload, proof: undefined })) return fail();
      if (!await deps.current() || signal.aborted) return fail();
      return { body: result, httpStatus: 200 };
    }
    if (command.op === "verify") {
      if (!payload.backendId) return unknown();
      response = await deps.call(`/api/verifications/${payload.backendId}/verify`, { code: command.code });
    } else if (purpose === "recovery") response = await deps.call("/api/auth/recovery", { identifier: payload.target });
    else if (command.op === "resend") {
      if (!payload.backendId) return unknown(); response = await deps.call(`/api/verifications/${payload.backendId}/resend`, {});
    } else response = await deps.call(purpose === "registration" ? "/api/verifications" : purpose === "contact" ? "/api/me/contact-changes" : "/api/me/password/code",
      purpose === "password-email" ? {} : { channel: payload.channel, target: payload.target, ...(purpose === "contact" && command.op === "start" ? { currentPassword: command.currentPassword } : {}) });
    if (!await deps.current() || signal.aborted) return unknown();
    if (response.status === "http-error" && response.httpStatus < 500) {
      if (!await publish(command.op === "start" ? "failed" : "code", payload)) return fail();
      return { ...fail(response.httpStatus, response.code, false), body: { status: "error", code: response.code, uncertain: false, retryAfterMs: response.retryAfterMs === undefined ? undefined : Math.min(3_600_000, response.retryAfterMs) } };
    }
    if (response.status !== "success") return unknown();
    let nextPayload: FlowPayload, expiresAt: number, phase: "code" | "verified" = "code";
    if (command.op === "verify") {
      const token = z.object({ verificationToken: z.string().min(1).max(1024), expiresAt: z.iso.datetime({ offset: true }) }).safeParse(response.data);
      if (response.httpStatus !== 200 || !token.success) return unknown();
      phase = "verified"; expiresAt = Math.min(Date.parse(token.data.expiresAt), Date.now() + 600_000); nextPayload = { ...payload, proof: token.data.verificationToken };
    } else if (purpose === "recovery") {
      const recovery = z.object({ requestId: z.guid() }).safeParse(response.data);
      if (response.httpStatus !== 202 || !recovery.success) return unknown();
      // Uniform timing/metadata for real and dummy IDs; recovery resend starts afresh.
      expiresAt = Date.now() + 300_000; nextPayload = { ...payload, backendId: recovery.data.requestId, nextResendAt: Date.now() + 60_000, sendsLeft: null };
    } else {
      const started = startedSchema.safeParse(purpose === "contact" && command.op === "start" ? z.object({ verification: startedSchema }).safeParse(response.data).data?.verification : response.data);
      if (response.httpStatus !== (command.op === "resend" ? 200 : 201) || !started.success) return unknown();
      expiresAt = Math.min(Date.parse(started.data.expiresAt), Date.now() + 300_000);
      nextPayload = { ...payload, backendId: started.data.verificationId, maskedTarget: started.data.maskedTarget, nextResendAt: Date.parse(started.data.nextResendAt), sendsLeft: started.data.sendsLeft };
    }
    if (expiresAt <= Date.now()) return unknown();
    const settled = await publish(phase, nextPayload, expiresAt);
    return settled && await deps.current() && !signal.aborted ? { body: { status: "success", flow: view(settled) }, httpStatus: 200 } : fail();
  } catch { return unknown(); }
}
