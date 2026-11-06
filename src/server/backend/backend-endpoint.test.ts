import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { parseServerBackendConfig } from "@/server/config/backend-config";
import { resolveBackendEndpoint } from "@/server/backend/backend-endpoint";

function config() {
  const result = parseServerBackendConfig({ NODE_ENV: "test", OMTS_DATA_SOURCE: "api",
    OMTS_API_BASE_URL: "https://backend.example.test", OMTS_API_TIMEOUT_MS: "5000" });
  if (result.status !== "valid") throw new Error("Expected valid fixture config");
  return result.config;
}

describe("server backend endpoint catalog, no fetch or refresh", () => {
  it.each([
    ["login", "POST", "/api/auth/login"], ["identity", "GET", "/api/me"],
    ["permissions", "GET", "/api/me/permissions"], ["profileRead", "GET", "/api/me/profile"],
    ["profileUpdate", "PUT", "/api/me/profile"], ["logout", "POST", "/api/auth/logout"],
  ])("resolves only catalog endpoint %s", (endpoint, method, path) => {
    expect(resolveBackendEndpoint(config(), endpoint)).toEqual({
      status: "resolved", target: { url: `https://backend.example.test${path}`, method },
    });
  });
  it.each(["refresh", "/api/auth/refresh", "https://other.example/api/me", "//other.example",
    "../api/me", "profileRead?url=evil", "__proto__", "constructor", "", undefined, null, {}])(
    "rejects arbitrary target case %#", (target) => {
      expect(resolveBackendEndpoint(config(), target)).toEqual({ status: "invalid-target" });
    },
  );
  it("does not silently turn mock into API mode", () => {
    expect(resolveBackendEndpoint({ source: "mock" }, "login")).toEqual({ status: "disabled" });
  });
  it("returns detached frozen targets and never performs fetch", () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("Unexpected network call"));
    try {
      const result = resolveBackendEndpoint(config(), "login");
      expect(result.status).toBe("resolved");
      if (result.status !== "resolved") throw new Error("Expected resolved target");
      expect(Object.isFrozen(result.target)).toBe(true);
      expect(result.target).not.toHaveProperty("token");
      expect(fetchSpy).not.toHaveBeenCalled();
    } finally { fetchSpy.mockRestore(); }
  });
  it.each(["invalid-origin", "https://user:fixture@backend.example.test", "https://backend.example.test/path"])(
    "redacts a wrongly constructed internal config case %#", (origin) => {
      expect(resolveBackendEndpoint({ source: "api", origin, timeoutMs: 5000 }, "login"))
        .toEqual({ status: "invalid-target" });
    },
  );
});
