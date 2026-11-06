import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { parseServerBackendConfig } from "@/server/config/backend-config";

const api = { NODE_ENV: "development", OMTS_DATA_SOURCE: "api", OMTS_API_BASE_URL: "http://127.0.0.1:5280", OMTS_API_TIMEOUT_MS: "5000" };

describe("server-only backend configuration, no runtime activation", () => {
  it.each(["5000\r", "5000\r\n"])("rejects a trailing line terminator in timeout case %#", (timeout) => {
    expect(parseServerBackendConfig({ ...api, OMTS_API_TIMEOUT_MS: timeout }).status).toBe("invalid-config");
  });
  it("requires an explicit source instead of guessing or falling back", () => {
    expect(parseServerBackendConfig({ NODE_ENV: "development" })).toEqual({ status: "invalid-config", fields: ["OMTS_DATA_SOURCE"] });
    expect(parseServerBackendConfig({ ...api, OMTS_DATA_SOURCE: "auto" }).status).toBe("invalid-config");
  });
  it("keeps mock configuration minimal and immutable", () => {
    const result = parseServerBackendConfig({ NODE_ENV: "test", OMTS_DATA_SOURCE: "mock", PATH: "irrelevant" });
    expect(result).toEqual({ status: "valid", config: { source: "mock" } });
    if (result.status !== "valid") throw new Error("Expected valid config");
    expect(Object.isFrozen(result.config)).toBe(true);
    expect(parseServerBackendConfig({ ...api, OMTS_DATA_SOURCE: "mock" }).status).toBe("invalid-config");
  });
  it("parses explicit local API settings without performing network I/O", () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("Unexpected network call"));
    try {
      expect(parseServerBackendConfig(api)).toEqual({ status: "valid", config: { source: "api", origin: "http://127.0.0.1:5280", timeoutMs: 5000 } });
      expect(fetchSpy).not.toHaveBeenCalled();
    } finally { fetchSpy.mockRestore(); }
  });
  it.each(["https://api.example.test", "https://api.example.test/", "https://API.example.test:443/"])(
    "normalizes a permitted production origin %s", (origin) => {
      expect(parseServerBackendConfig({ ...api, NODE_ENV: "production", OMTS_API_BASE_URL: origin }))
        .toEqual({ status: "valid", config: { source: "api", origin: "https://api.example.test", timeoutMs: 5000 } });
    },
  );
  it.each(["http://localhost:5280", "http://[::1]:5280"])("accepts loopback HTTP for local tests %s", (origin) => {
    expect(parseServerBackendConfig({ ...api, NODE_ENV: "test", OMTS_API_BASE_URL: origin }).status).toBe("valid");
  });
  it.each([undefined, "", "http://remote.example", "ftp://api.example", "https://user:secret@api.example",
    "https://api.example/path", "https://api.example/..", "https://api.example/%2e", "https://api.example?x=1",
    "https://api.example#hash", "//api.example", " https://api.example", "https://api.example\n",
    "https://api.example\\evil", "https://%61pi.example", "https://api.example:99999", "https://@api.example"])(
    "rejects invalid API origin case %# without echoing values", (origin) => {
      expect(parseServerBackendConfig({ ...api, OMTS_API_BASE_URL: origin }))
        .toEqual({ status: "invalid-config", fields: ["OMTS_API_BASE_URL"] });
    },
  );
  it("does not permit production plaintext even on loopback", () => {
    expect(parseServerBackendConfig({ ...api, NODE_ENV: "production" }).status).toBe("invalid-config");
  });
  it.each([undefined, "", "0", "-1", "1.5", "1e3", "0x10", " 5000", "5000\n", "60001", 5000])(
    "requires bounded decimal timeout case %#", (timeout) => {
      expect(parseServerBackendConfig({ ...api, OMTS_API_TIMEOUT_MS: timeout }))
        .toEqual({ status: "invalid-config", fields: ["OMTS_API_TIMEOUT_MS"] });
    },
  );
  it.each(["1", "60000"])("accepts timeout boundary %s", (timeout) => {
    expect(parseServerBackendConfig({ ...api, OMTS_API_TIMEOUT_MS: timeout }).status).toBe("valid");
  });
  it.each(["NEXT_PUBLIC_API_BASE_URL", "NEXT_PUBLIC_OMTS_API_BASE_URL"])("rejects public alias %s instead of using it", (field) => {
    const result = parseServerBackendConfig({ ...api, [field]: "https://fixture-private-url.example" });
    expect(result).toEqual({ status: "invalid-config", fields: [field] });
    expect(JSON.stringify(result)).not.toContain("fixture-private-url");
  });
  it("never mutates caller environment or reads implicit secrets", () => {
    const input = Object.freeze({ ...api, PASSWORD: "not-a-real-fixture-secret" });
    const before = { ...input };
    expect(parseServerBackendConfig(input).status).toBe("valid");
    expect(input).toEqual(before);
    expect(JSON.stringify(parseServerBackendConfig({ ...api, NODE_ENV: "unknown" })))
      .toBe(JSON.stringify({ status: "invalid-config", fields: ["NODE_ENV"] }));
  });
});
