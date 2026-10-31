import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { projectBackendDiagnostic } from "./backend-diagnostic";
import { secretCanaries } from "./__tests__/serialization-fixtures";

describe("minimal server diagnostic projection", () => {
  it.each(["success", "http-error", "disabled", "invalid-config", "invalid-request", "invalid-response", "timeout", "unavailable"])(
    "retains technical outcome %s only, not arbitrary context", (status) => {
      const result = projectBackendDiagnostic("login", { status, httpStatus: 401, data: { token: secretCanaries[0] },
        request: { password: secretCanaries[2] }, cause: new Error(secretCanaries[1]), code: secretCanaries[0], detail: secretCanaries[2] });
      expect(result).toEqual({ event: "backend-request", endpoint: "login", outcome: status,
        ...(status === "http-error" ? { httpStatus: 401 } : {}) });
      expect(Object.isFrozen(result)).toBe(true);
      for (const secret of secretCanaries) expect(JSON.stringify(result)).not.toContain(secret);
    },
  );
  it.each(["refresh", "https://evil.test", secretCanaries[0], "constructor"])("rejects noncatalog target case %#", (target) => {
    expect(projectBackendDiagnostic(target, { status: "success" })).toEqual({ event: "backend-request", outcome: "invalid-diagnostic" });
  });
  it.each([{ status: secretCanaries[0] }, { status: "http-error", httpStatus: 600 }, { status: "success", httpStatus: NaN }, null])(
    "rejects malformed result case %# without logging raw data", (result) => {
      expect(projectBackendDiagnostic("identity", result)).toEqual({ event: "backend-request", outcome: "invalid-diagnostic" });
    },
  );
  it("does not access hidden token/data/error getters while projecting safe fields", () => {
    expect(projectBackendDiagnostic("profileRead", { status: "success", get data() { throw new Error(secretCanaries[0]); } }))
      .toEqual({ event: "backend-request", endpoint: "profileRead", outcome: "success" });
    expect(projectBackendDiagnostic("profileRead", { get status() { throw new Error(secretCanaries[0]); } }))
      .toEqual({ event: "backend-request", outcome: "invalid-diagnostic" });
  });
});
