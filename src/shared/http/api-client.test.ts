import { describe, expect, it, vi } from "vitest";
import { createApiClient } from "@/shared/http/api-client";
import { ApiError } from "@/shared/http/api-error";
import { sessionExpiryChannel } from "@/shared/session/session-expiry-channel";

describe("createApiClient", () => {
  it("returns a parsed JSON response", async () => {
    const fetchImplementation = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify({ name: "OMTS" }), {
        headers: { "content-type": "application/json" },
        status: 200,
      }),
    );
    const client = createApiClient({
      baseUrl: "https://qa.example.test/api",
      fetchImplementation,
    });

    await expect(client.request<{ name: string }>("system")).resolves.toEqual({
      name: "OMTS",
    });
    expect(fetchImplementation).toHaveBeenCalledOnce();
  });

  it.each([
    ["object", { Authorization: "Bearer object-token" }],
    ["tuple", [["Authorization", "Bearer tuple-token"]] as [string, string][]],
    ["Headers", new Headers({ Authorization: "Bearer headers-token" })],
  ])("preserves headers supplied as %s", async (_, headers) => {
    const fetchImplementation = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response(null, { status: 204 }));
    const client = createApiClient({
      baseUrl: "https://qa.example.test/api",
      fetchImplementation,
    });

    await client.request("protected", { headers });

    const requestInit = fetchImplementation.mock.calls[0]?.[1];
    const sentHeaders = new Headers(requestInit?.headers);

    expect(sentHeaders.get("authorization")).toContain("token");
    expect(sentHeaders.get("accept")).toBe("application/json");
  });

  it("keeps the caller's explicit Accept header", async () => {
    const fetchImplementation = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response("plain text", { status: 200 }));
    const client = createApiClient({
      baseUrl: "https://qa.example.test/api",
      fetchImplementation,
    });

    await client.request("report", {
      headers: { Accept: "text/plain" },
    });

    const requestInit = fetchImplementation.mock.calls[0]?.[1];
    const sentHeaders = new Headers(requestInit?.headers);

    expect(sentHeaders.get("accept")).toBe("text/plain");
  });

  it("maps the final 401 response to MSG19 and notifies the application layer", async () => {
    const fetchImplementation = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response(null, { status: 401 }));
    const onUnauthorized = vi.fn();
    const sessionExpiryListener = vi.fn();
    const unsubscribe = sessionExpiryChannel.subscribe(sessionExpiryListener);
    const client = createApiClient({
      baseUrl: "https://qa.example.test/api",
      fetchImplementation,
      onUnauthorized,
    });

    try {
      await expect(client.request("protected", { errorContext: "protected" })).rejects.toMatchObject({
        appMessage: { code: "MSG19" },
        status: 401,
      });
      expect(onUnauthorized).toHaveBeenCalledWith({ code: "MSG19" });
      expect(sessionExpiryListener).toHaveBeenCalledWith({ code: "MSG19" });
    } finally {
      unsubscribe();
    }
  });

  it("maps other unsuccessful responses to the generic service message", async () => {
    const fetchImplementation = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response(null, { status: 503 }));
    const client = createApiClient({
      baseUrl: "https://qa.example.test/api",
      fetchImplementation,
    });

    await expect(client.request("health")).rejects.toMatchObject({
      appMessage: { code: "MSG04" },
      status: 503,
    });
  });

  it("maps a network failure to MSG04 without inventing an HTTP status", async () => {
    const networkError = new TypeError("Failed to fetch");
    const fetchImplementation = vi
      .fn<typeof fetch>()
      .mockRejectedValue(networkError);
    const client = createApiClient({
      baseUrl: "https://qa.example.test/api",
      fetchImplementation,
    });

    const request = client.request("health");

    await expect(request).rejects.toMatchObject({
      appMessage: { code: "MSG04" },
      cause: networkError,
      status: null,
    });
  });

  it("preserves AbortError so callers can distinguish a cancelled request", async () => {
    const abortError = new DOMException("Request cancelled", "AbortError");
    const fetchImplementation = vi
      .fn<typeof fetch>()
      .mockRejectedValue(abortError);
    const client = createApiClient({
      baseUrl: "https://qa.example.test/api",
      fetchImplementation,
    });

    await expect(client.request("health")).rejects.toBe(abortError);
  });

  it("maps malformed JSON to MSG04 and keeps the parsing cause", async () => {
    const fetchImplementation = vi.fn<typeof fetch>().mockResolvedValue(
      new Response("{invalid-json", {
        headers: { "content-type": "application/json" },
        status: 200,
      }),
    );
    const client = createApiClient({
      baseUrl: "https://qa.example.test/api",
      fetchImplementation,
    });

    try {
      await client.request("system");
      throw new Error("Expected the request to reject.");
    } catch (error) {
      expect(error).toBeInstanceOf(ApiError);
      expect(error).toMatchObject({
        appMessage: { code: "MSG04" },
        status: 200,
      });
      expect((error as ApiError).cause).toBeInstanceOf(SyntaxError);
    }
  });

  it("returns text responses and treats 204 as an empty result", async () => {
    const fetchImplementation = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(new Response("ready", { status: 200 }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }));
    const client = createApiClient({
      baseUrl: "https://qa.example.test/api",
      fetchImplementation,
    });

    await expect(client.request<string>("status")).resolves.toBe("ready");
    await expect(client.request<void>("session", { method: "DELETE" })).resolves.toBeUndefined();
  });
});
