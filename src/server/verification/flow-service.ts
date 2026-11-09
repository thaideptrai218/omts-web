import "server-only";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import type { VerificationCommand, VerificationResult, VerificationView } from "@/features/verification-api/contracts";
import { profileViewSchema } from "@/features/profile/api/profile-contract.schemas";
import type { BackendTransportResult } from "@/server/backend/backend-result";
import { startedSchema, type FlowBinding, type FlowPayload, type OpenFlow, type VerificationFlowStore } from "./flow-store";

// What the Route Handler must do with the flow cookie. No change when absent.
export type FlowCookieChange = { action: "set"; value: string; maxAgeSeconds: number } | { action: "clear" };
export type VerificationReply = { body: VerificationResult; httpStatus: number; flowCookie?: FlowCookieChange };
export type VerificationDependencies = {
  store: VerificationFlowStore; binding: FlowBinding; signal: AbortSignal;
  // The raw flow cookie value of this request, if any.
  cookie: string | undefined;
  current(): Promise<boolean>;
  call(path: string, body?: unknown): Promise<BackendTransportResult>;
  account?: { id: string; subjectType: string };
};
const START_TTL_MS = 300_000, PROOF_TTL_MS = 600_000, RESEND_DELAY_MS = 60_000;
const fail = (httpStatus = 503, code?: string, uncertain = true): VerificationReply => ({ body: { status: "error", code, uncertain }, httpStatus });
function view(flow: OpenFlow): VerificationView {
  const p = flow.payload;
  return { id: flow.id, purpose: flow.purpose, phase: flow.phase, channel: p.channel ?? null, maskedTarget: p.maskedTarget, expiresAt: new Date(flow.expiresAt).toISOString(),
    nextResendAt: p.nextResendAt === null ? null : new Date(p.nextResendAt).toISOString(), sendsLeft: p.sendsLeft };
}
function mask(target = "") {
  const at = target.indexOf("@"); return at > 0 ? `${target.slice(0, 1)}***${target.slice(at)}` : `***${target.slice(-3)}`;
}
export async function runVerification(command: VerificationCommand, deps: VerificationDependencies): Promise<VerificationReply> {
  const { store, binding, signal } = deps;
  const purpose = binding.purpose;
  // A sealed copy of the flow for the response. Without one the new state cannot be kept, which is an unknown outcome.
  async function publish(flow: OpenFlow): Promise<FlowCookieChange | undefined> {
    const value = await store.seal(binding, flow);
    return value ? { action: "set", value, maxAgeSeconds: Math.max(1, Math.ceil((flow.expiresAt - Date.now()) / 1000)) } : undefined;
  }
  const clear: FlowCookieChange = { action: "clear" };
  try {
    if (signal.aborted || !await deps.current()) return fail(409, undefined, false);
    let flow: OpenFlow | undefined;
    if (command.op !== "start") {
      const existing = await store.open(binding, deps.cookie);
      if (existing.status !== "found") return command.op === "read" ? { body: { status: "empty" }, httpStatus: 200 } : fail(410, "MSG16", false);
      flow = existing.flow;
      if (command.op === "read") return await deps.current() && !signal.aborted ? { body: { status: "success", flow: view(flow) }, httpStatus: 200 } : fail(409, undefined, false);
      if (flow.id !== command.id) return fail(409, undefined, false);
      if (command.op === "cancel") return { body: { status: "cancelled" }, httpStatus: 200, flowCookie: clear };
      if (command.op === "resend" && flow.payload.nextResendAt && flow.payload.nextResendAt > Date.now()) return { body: { status: "error", code: "TOO_MANY_REQUESTS", uncertain: false, retryAfterMs: Math.min(3_600_000, flow.payload.nextResendAt - Date.now()) }, httpStatus: 429 };
      if ((command.op === "complete") !== (flow.phase === "verified")) return fail(409, undefined, false);
    }
    const payload: FlowPayload = flow?.payload ?? { target: command.op === "start" ? command.target : undefined, channel: command.op === "start" ? (purpose === "phone" ? "Sms" : command.channel) : undefined,
      maskedTarget: mask(command.op === "start" ? command.target : ""), nextResendAt: null, sendsLeft: null };
    let response: BackendTransportResult;
    if (command.op === "complete") {
      if (!payload.proof) return fail(409, undefined, false);
      const path = purpose === "recovery" ? "/api/auth/recovery/reset" : purpose === "phone" ? "/api/me/phone-verification/confirm" : "/api/me/contact-changes/confirm";
      const body = purpose === "recovery" ? { verificationToken: payload.proof, newPassword: command.newPassword, passwordConfirmation: command.confirmPassword } : { verificationToken: payload.proof };
      response = await deps.call(path, body);
      if (!await deps.current() || signal.aborted) return fail();
      // A refusal ends the flow: the proof is single use, so the user starts again.
      if (response.status === "http-error" && response.httpStatus < 500) return { ...fail(response.httpStatus, response.code, false), flowCookie: clear };
      if (response.status !== "success" || response.httpStatus !== 200) return fail();
      let result: VerificationResult = { status: "completed" };
      if (purpose === "contact") {
        const contact = z.object({ contact: z.string().min(1).max(254), oldDocumentsHidden: z.boolean() }).safeParse(response.data);
        if (!contact.success) return fail();
        let profileResponse: BackendTransportResult;
        try { profileResponse = await deps.call("/api/me/profile"); } catch { profileResponse = { status: "unavailable" }; }
        if (!await deps.current() || signal.aborted) return fail();
        const profile = profileResponse.status === "success" && profileResponse.httpStatus === 200 ? profileViewSchema.safeParse(profileResponse.data) : undefined;
        const matching = profile?.success && profile.data.accountId === deps.account?.id && profile.data.subjectType === deps.account.subjectType
          && (payload.channel === "Email" ? profile.data.email === contact.data.contact && profile.data.emailVerified : profile.data.phoneNumber === contact.data.contact && profile.data.phoneVerified);
        result = { ...result, oldDocumentsHidden: contact.data.oldDocumentsHidden, profile: matching ? profile.data : null };
      } else if (purpose === "phone") {
        // The number is now verified on the account; the caller re-reads the session phase to move on.
        const confirmed = z.object({ contact: z.string().min(1).max(254), notice: z.string().max(1000).nullish(), noticeCode: z.string().max(64).nullish() }).safeParse(response.data);
        if (!confirmed.success) return fail();
      } else if (!z.object({}).safeParse(response.data).success) return fail();
      return { body: result, httpStatus: 200, flowCookie: clear };
    }
    if (command.op === "verify") {
      if (!payload.backendId) return fail();
      response = await deps.call(`/api/verifications/${payload.backendId}/verify`, { code: command.code });
    } else if (purpose === "recovery") response = await deps.call("/api/auth/recovery", { identifier: payload.target });
    else if (command.op === "resend") {
      if (!payload.backendId) return fail(); response = await deps.call(`/api/verifications/${payload.backendId}/resend`, {});
    } else if (purpose === "phone") response = await deps.call("/api/me/phone-verification", { phoneNumber: null });
    else response = await deps.call("/api/me/contact-changes", { channel: payload.channel, target: payload.target, currentPassword: command.op === "start" ? command.currentPassword : undefined });
    if (!await deps.current() || signal.aborted) return fail();
    // A 503 that carries an API message is a definite answer (the code could not be sent, nothing changed), so the user sees it.
    if (response.status === "http-error" && (response.httpStatus < 500 || (response.httpStatus === 503 && response.code))) {
      // The flow keeps its state: a wrong code or an early resend does not end it.
      return { ...fail(response.httpStatus, response.code, false), body: { status: "error", code: response.code, uncertain: false, retryAfterMs: response.retryAfterMs === undefined ? undefined : Math.min(3_600_000, response.retryAfterMs) } };
    }
    if (response.status !== "success") return fail();
    let next: OpenFlow;
    if (command.op === "verify") {
      const token = z.object({ verificationToken: z.string().min(1).max(1024), expiresAt: z.iso.datetime({ offset: true }) }).safeParse(response.data);
      if (response.httpStatus !== 200 || !token.success || !flow) return fail();
      next = { ...flow, phase: "verified", expiresAt: Math.min(Date.parse(token.data.expiresAt), Date.now() + PROOF_TTL_MS), payload: { ...payload, proof: token.data.verificationToken } };
    } else if (purpose === "recovery") {
      const recovery = z.object({ requestId: z.guid() }).safeParse(response.data);
      if (response.httpStatus !== 202 || !recovery.success) return fail();
      // The answer is the same for real and unknown accounts, so timing and metadata are uniform; a resend starts afresh.
      next = { id: flow?.id ?? randomUUID(), purpose, phase: "code", expiresAt: Date.now() + START_TTL_MS,
        payload: { ...payload, backendId: recovery.data.requestId, nextResendAt: Date.now() + RESEND_DELAY_MS, sendsLeft: null } };
    } else {
      // Contact changes wrap the started verification; the phone verification returns it at the top level.
      const started = startedSchema.safeParse(command.op === "start" && purpose !== "phone" ? z.object({ verification: startedSchema }).safeParse(response.data).data?.verification : response.data);
      if (response.httpStatus !== (command.op === "resend" ? 200 : 201) || !started.success) return fail();
      next = { id: flow?.id ?? randomUUID(), purpose, phase: "code", expiresAt: Math.min(Date.parse(started.data.expiresAt), Date.now() + START_TTL_MS),
        payload: { ...payload, backendId: started.data.verificationId, maskedTarget: started.data.maskedTarget, nextResendAt: Date.parse(started.data.nextResendAt), sendsLeft: started.data.sendsLeft } };
    }
    if (next.expiresAt <= Date.now()) return fail();
    const flowCookie = await publish(next);
    return flowCookie ? { body: { status: "success", flow: view(next) }, httpStatus: 200, flowCookie } : fail();
  } catch { return fail(); }
}
