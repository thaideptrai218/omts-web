import { describe, expect, it } from "vitest";
import { mapApiError, type ApiErrorContext } from "@/shared/http/map-api-error";

describe("context-aware error policy", () => {
  it("maps invalid credentials only in login context", () => {
    expect(mapApiError(401, "login", { code: "MSG12" })).toEqual({
      expireSession: false, message: { code: "MSG12" },
    });
    expect(mapApiError(401, "public", { code: "MSG12" }).expireSession).toBe(false);
  });

  it.each(["protected", "profile"] as const)("expires a final protected 401 in %s context", (context) => {
    expect(mapApiError(401, context)).toEqual({ expireSession: true, message: { code: "MSG19" } });
  });

  it.each(["public", "login", "refresh"] satisfies ApiErrorContext[])(
    "does not publish automatic session expiry for %s", (context) => {
      expect(mapApiError(401, context, { code: "MSG19" }).expireSession).toBe(false);
    },
  );

  it.each([
    [403, "MSG13"], [403, "MSG67"], [403, "MSG68"], [403, "MSG02"],
    [423, "MSG69"], [400, "MSG01"], [400, "MSG20"],
  ] as const)("preserves supported HTTP %i / %s without expiring the session", (status, code) => {
    expect(mapApiError(status, "protected", { code })).toEqual({
      expireSession: false, message: { code },
    });
  });

  it.each([
    [500, "MSG12"], [401, "MSG69"], [429, "RATE_LIMITED"],
    [503, "FUTURE_CODE"], [403, "PASSWORD_CHANGE_REQUIRED"],
  ] as const)("uses safe copy for unsupported status/code pair %i / %s", (status, code) => {
    expect(mapApiError(status, "public", { code })).toEqual({
      expireSession: false, message: { code: "MSG04" },
    });
  });

  it("does not invent conflict parameters or parse English detail", () => {
    expect(mapApiError(409, "profile", { code: "MSG06" }).message).toEqual({ code: "MSG04" });
    const problem = { code: "MSG06", params: { user_name: "Người kiểm thử", time: "10:30" } };
    expect(mapApiError(409, "profile", problem).message).toEqual({ code: "MSG06", params: problem.params });
  });

  it("only forwards parameters required by the known message template", () => {
    expect(mapApiError(400, "profile", { code: "MSG01", params: { unexpected: "private" } }).message)
      .toEqual({ code: "MSG01" });
    expect(mapApiError(409, "profile", {
      code: "MSG06", params: { user_name: "QA", time: "10:30", unexpected: "private" },
    }).message).toEqual({ code: "MSG06", params: { user_name: "QA", time: "10:30" } });
    expect(mapApiError(409, "profile", {
      code: "MSG06", params: { user_name: " ", time: "10:30" },
    }).message).toEqual({ code: "MSG04" });
  });
});
