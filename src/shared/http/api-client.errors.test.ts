import { describe, expect, it, vi } from "vitest";
import { createApiClient } from "@/shared/http/api-client";
import { sessionExpiryChannel } from "@/shared/session/session-expiry-channel";

function clientFor(response: Response) {
  const fetchImplementation = vi.fn<typeof fetch>().mockResolvedValue(response);
  return { fetchImplementation, client: createApiClient({
    baseUrl: "https://backend.example.test/api/", fetchImplementation,
  }) };
}

describe("HTTP client error boundary", () => {
  it.each(["public", "login", "refresh"] as const)(
    "does not expire global auth or refresh automatically for a %s 401", async (errorContext) => {
      const listener = vi.fn();
      const unsubscribe = sessionExpiryChannel.subscribe(listener);
      const { client, fetchImplementation } = clientFor(new Response(null, { status: 401 }));
      try {
        await expect(client.request("example", { errorContext })).rejects.toMatchObject({ status: 401 });
        expect(listener).not.toHaveBeenCalled();
        expect(fetchImplementation).toHaveBeenCalledOnce();
        expect(fetchImplementation.mock.calls[0]?.[1]).not.toHaveProperty("errorContext");
      } finally { unsubscribe(); }
    },
  );

  it("preserves throttling metadata without waiting or retrying", async () => {
    const { client, fetchImplementation } = clientFor(new Response(
      JSON.stringify({ code: "RATE_LIMITED", detail: "private diagnostic" }),
      { status: 429, headers: { "content-type": "application/problem+json", "retry-after": "60" } },
    ));
    await expect(client.request("auth/login", { errorContext: "login" })).rejects.toMatchObject({
      status: 429, retryAfterMs: 60_000, appMessage: { code: "MSG04" },
      problem: { code: "RATE_LIMITED" },
    });
    expect(fetchImplementation).toHaveBeenCalledOnce();
  });

  it("keeps the final protected 401 when an observer throws", async () => {
    const client = createApiClient({
      baseUrl: "https://backend.example.test/api/",
      fetchImplementation: vi.fn<typeof fetch>().mockResolvedValue(new Response(null, { status: 401 })),
      onUnauthorized() { throw new Error("broken observer"); },
    });
    await expect(client.request("me", { errorContext: "protected" })).rejects.toMatchObject({
      name: "ApiError", status: 401, appMessage: { code: "MSG19" },
    });
  });

  it("maps interrupted success-body reads while preserving cancellation", async () => {
    for (const cause of [new TypeError("connection interrupted"), new DOMException("Cancelled", "AbortError")]) {
      const body = new ReadableStream({ start(controller) { controller.error(cause); } });
      const { client } = clientFor(new Response(body, { headers: { "content-type": "application/json" } }));
      const result = client.request("me");
      if (cause.name === "AbortError") await expect(result).rejects.toBe(cause);
      else await expect(result).rejects.toMatchObject({ status: 200, appMessage: { code: "MSG04" }, cause });
    }
  });
});
