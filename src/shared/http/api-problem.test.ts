import { describe, expect, it } from "vitest";
import { isJsonContentType, readApiProblem, readRetryAfterMs } from "@/shared/http/api-problem";

function jsonResponse(body: unknown) {
  return new Response(JSON.stringify(body), {
    headers: { "content-type": "application/problem+json" }, status: 409,
  });
}

describe("readApiProblem", () => {
  it("keeps structured metadata but discards raw details and credential fields", async () => {
    const safeProblem = {
      code: "MSG06", params: { user_name: "Người kiểm thử", time: "10:30" },
      currentRowVersion: "opaque-version",
    };
    await expect(readApiProblem(jsonResponse({
      ...safeProblem, detail: "private stack trace", accessToken: "private-token",
      status: 200, instance: "/private/path",
    }))).resolves.toEqual(safeProblem);
  });

  it("retains unknown technical codes without rendering their detail", async () => {
    await expect(readApiProblem(jsonResponse({
      code: "PASSWORD_CHANGE_REQUIRED", detail: "English gate text",
    }))).resolves.toEqual({ code: "PASSWORD_CHANGE_REQUIRED" });
  });

  it.each([null, [], "not an object"])("rejects an invalid problem root: %j", async (body) => {
    await expect(readApiProblem(jsonResponse(body))).resolves.toBeUndefined();
  });

  it("drops malformed optional metadata without losing a valid code", async () => {
    await expect(readApiProblem(jsonResponse({
      code: "MSG06", params: { user_name: { nested: true } }, currentRowVersion: 10,
    }))).resolves.toEqual({ code: "MSG06" });
  });

  it("handles malformed JSON and non-JSON error pages safely", async () => {
    const malformed = new Response("{broken", { headers: { "content-type": "application/json" } });
    const html = new Response("<h1>private trace</h1>", { headers: { "content-type": "text/html" } });
    await expect(readApiProblem(malformed)).resolves.toBeUndefined();
    await expect(readApiProblem(html)).resolves.toBeUndefined();
  });

  it("does not swallow cancellation while reading an error body", async () => {
    const abort = new DOMException("Cancelled", "AbortError");
    const body = new ReadableStream({ start(controller) { controller.error(abort); } });
    const response = new Response(body, { headers: { "content-type": "application/json" } });
    await expect(readApiProblem(response)).rejects.toBe(abort);
  });
});

describe("HTTP response metadata", () => {
  it.each(["application/json", "APPLICATION/PROBLEM+JSON; charset=utf-8", "application/vnd.omts+json"])(
    "recognizes structured JSON content type %s", (type) => expect(isJsonContentType(type)).toBe(true),
  );

  it.each([null, "text/html", "text/plain; application/json"])(
    "does not parse non-JSON content type %s", (type) => expect(isJsonContentType(type)).toBe(false),
  );

  it("parses delay seconds and HTTP-date relative to an injected clock", () => {
    const now = Date.UTC(2026, 9, 24, 8);
    expect(readRetryAfterMs("60", now)).toBe(60_000);
    expect(readRetryAfterMs("0", now)).toBe(0);
    expect(readRetryAfterMs("Sat, 24 Oct 2026 08:01:00 GMT", now)).toBe(60_000);
    expect(readRetryAfterMs("Sat, 24 Oct 2026 07:00:00 GMT", now)).toBe(0);
  });

  it.each([null, "", "bad", "-1", "1.5", "9".repeat(100)])(
    "ignores invalid Retry-After %s", (value) => expect(readRetryAfterMs(value)).toBeUndefined(),
  );
});
