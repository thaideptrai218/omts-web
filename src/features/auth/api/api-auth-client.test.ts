import { afterEach, describe, expect, it, vi } from "vitest";
import { loginWithApi, postAuth } from "./api-auth-client";

afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });
describe("browser auth coordination", () => {
  it("a waiting tab reads the session and never posts retained credentials", async () => {
    vi.stubGlobal("isSecureContext", true);
    vi.stubGlobal("navigator", { locks: { request: vi.fn(async (_name, options, callback) => {
      return typeof options === "function" ? options({ name: "fixture" }) : callback(null);
    }) } });
    const fetcher = vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json({ status: "anonymous", clearCookie: false }, { status: 401 }));
    const result = await loginWithApi({ identifier: "fixture", password: "must-not-be-sent" });
    expect(result).toEqual({ status: "waited", destination: undefined });
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(fetcher.mock.calls[0][0]).toBe("/api/auth/session");
    expect(fetcher.mock.calls[0][1]?.method).toBe("GET");
  });
  it("refuses unsupported browsers before any request", async () => {
    vi.stubGlobal("isSecureContext", false);
    const fetcher = vi.spyOn(globalThis, "fetch");
    expect(await loginWithApi({ identifier: "fixture", password: "must-not-be-sent" })).toEqual({ status: "unsupported" });
    expect(fetcher).not.toHaveBeenCalled();
  });
  it("rejects a success DTO on a failed HTTP response", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json({ status: "created", destination: "/dashboard" }, { status: 503 }));
    expect(await postAuth("login", { identifier: "fixture", password: "fixture" })).toEqual({ status: "unavailable" });
  });
});
