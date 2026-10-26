import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { MAX_RESPONSE_BYTES, readBackendResponse } from "./backend-response";

function json(data: unknown, status = 200, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json", ...headers } });
}

describe("bounded server response and failure projection", () => {
  it("returns internal unknown JSON, not an approved public DTO", async () => {
    const result = await readBackendResponse(json({ accessToken: "fake-token" }), "login");
    expect(result).toEqual({ status: "success", httpStatus: 200, data: { accessToken: "fake-token" } });
    expect(result).not.toHaveProperty("headers");
  });
  it("does not parse the logout 204 body", async () => {
    const response = new Response(null, { status: 204 });
    const spy = vi.spyOn(response, "json");
    expect(await readBackendResponse(response, "logout")).toEqual({ status: "success", httpStatus: 204, data: undefined });
    expect(spy).not.toHaveBeenCalled();
    expect(await readBackendResponse(new Response(null, { status: 204 }), "identity")).toEqual({ status: "invalid-response" });
  });
  it.each([301, 302, 303, 307, 308])("rejects redirect status %i without returning its Location", async (status) => {
    expect(await readBackendResponse(new Response("secret", { status, headers: { Location: "https://evil.test" } }), "login"))
      .toEqual({ status: "invalid-response" });
  });
  it.each([undefined, "text/html", "application/jsonx"])("rejects unexpected JSON media type case %#", async (contentType) => {
    const headers = contentType ? { "Content-Type": contentType } : undefined;
    expect(await readBackendResponse(new Response('{}', { headers }), "identity")).toEqual({ status: "invalid-response" });
  });
  it.each(["application/json; charset=utf-8", "application/problem+json", "Application/JSON"])(
    "accepts JSON media type %s", async (contentType) => {
      expect((await readBackendResponse(new Response('{}', { headers: { "Content-Type": contentType } }), "identity")).status)
        .toBe("success");
    },
  );
  it.each(["", "{bad", "<html>fake-password</html>"])("redacts malformed JSON case %#", async (value) => {
    expect(await readBackendResponse(new Response(value, { headers: { "Content-Type": "application/json" } }), "login"))
      .toEqual({ status: "invalid-response" });
  });
  it("rejects invalid UTF-8 instead of silently substituting bytes", async () => {
    const result = await readBackendResponse(new Response(new Uint8Array([123, 34, 120, 34, 58, 34, 255, 34, 125]), {
      headers: { "Content-Type": "application/json" },
    }), "identity");
    expect(result.status).toBe("invalid-response");
  });
  it("enforces actual streamed bytes, not a supplied Content-Length", async () => {
    let cancelled = false;
    const stream = new ReadableStream<Uint8Array>({
      start(controller) { controller.enqueue(new Uint8Array(MAX_RESPONSE_BYTES + 1)); },
      cancel() { cancelled = true; },
    });
    expect(await readBackendResponse(new Response(stream, {
      headers: { "Content-Type": "application/json", "Content-Length": "2" },
    }), "identity")).toEqual({ status: "invalid-response" });
    expect(cancelled).toBe(true);
  });
  it("accepts the exact byte limit", async () => {
    expect((await readBackendResponse(json("x".repeat(MAX_RESPONSE_BYTES - 2)), "identity")).status).toBe("success");
  });
  it.each(["MSG06", "MSG12", "MSG19", "MSG69"])("keeps known code %s but strips all free-form error strings", async (code) => {
    const secret = "fake-token-password";
    const response = json({ code, detail: secret, title: secret, stack: secret, params: { user_name: secret }, currentRowVersion: secret }, 409,
      { "Set-Cookie": secret, Location: secret, "Retry-After": "3" });
    const result = await readBackendResponse(response, "profileUpdate");
    expect(result).toEqual({ status: "http-error", httpStatus: 409, code, retryAfterMs: 3000 });
    expect(JSON.stringify(result)).not.toContain(secret);
    expect(result).not.toHaveProperty("cause");
  });
  it.each(["FAKE_PASSWORD", "MSG999", "constructor", "__proto__", 19, null])("drops unknown error code case %#", async (code) => {
    expect(await readBackendResponse(json({ code }, 500), "login"))
      .toEqual({ status: "http-error", httpStatus: 500, code: undefined, retryAfterMs: undefined });
  });
  it("keeps HTTP failure without reflecting non-JSON error pages or retry strings", async () => {
    expect(await readBackendResponse(new Response("fake-password", { status: 503, headers: { "Retry-After": "fake-token" } }), "login"))
      .toEqual({ status: "http-error", httpStatus: 503, code: undefined, retryAfterMs: undefined });
  });
});
