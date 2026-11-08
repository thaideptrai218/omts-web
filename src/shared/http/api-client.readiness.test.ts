import { describe, expect, it, vi } from "vitest";
import { createApiClient } from "@/shared/http/api-client";
import { sessionExpiryChannel } from "@/shared/session/session-expiry-channel";

// Converted from the audit's characterization tests into regression coverage.
describe("API integration error regressions", () => {
  it("preserves incorrect login credentials without expiring another session", async () => {
    const listener = vi.fn();
    const unsubscribe = sessionExpiryChannel.subscribe(listener);
    const client = createApiClient({
      baseUrl: "https://backend.example.test/api/",
      fetchImplementation: vi.fn<typeof fetch>().mockResolvedValue(
        new Response(JSON.stringify({ code: "MSG12", status: 401 }), {
          headers: { "content-type": "application/problem+json" },
          status: 401,
        }),
      ),
    });

    try {
      await expect(
        client.request("auth/login", {
          body: JSON.stringify({ identifier: "fixture", password: "fixture-only" }),
          headers: { "content-type": "application/json" },
          method: "POST",
          errorContext: "login",
        }),
      ).rejects.toMatchObject({
        appMessage: { code: "MSG12" },
        status: 401,
      });
      expect(listener).not.toHaveBeenCalled();
    } finally {
      unsubscribe();
    }
  });

  it.each([
    { code: "MSG67", method: "GET", path: "me/permissions", status: 403, errorContext: "protected" },
    { code: "MSG68", method: "POST", path: "auth/login", status: 403, errorContext: "login" },
    { code: "MSG69", method: "POST", path: "auth/login", status: 423, errorContext: "login" },
    { code: "MSG06", method: "PUT", path: "me/profile", status: 409, errorContext: "profile" },
  ] as const)("preserves wire code $code from HTTP $status", async ({ code, method, path, status, errorContext }) => {
    const client = createApiClient({
      baseUrl: "https://backend.example.test/api/",
      fetchImplementation: vi.fn<typeof fetch>().mockResolvedValue(
        new Response(JSON.stringify({ code, status }), {
          headers: { "content-type": "application/problem+json" },
          status,
        }),
      ),
    });

    await expect(client.request(path, { method, errorContext })).rejects.toMatchObject({
      appMessage: { code: code === "MSG06" ? "MSG04" : code },
      problem: { code },
      status,
    });
  });
});
