import "server-only";
import { randomBytes } from "node:crypto";
import { z } from "zod";
import { createCsrfGuard } from "./csrf-guard";
import { createSessionCookieHelpers } from "./session-cookies";
import { getSessionGateway } from "./session-gateway.instance";
import { currentPasswordChangeSchema } from "@/features/account-security/schemas/change-password-schema";

const login = z.strictObject({ identifier: z.string().trim().min(1).max(254), password: z.string().min(1).max(128) });

export async function handleApiAuth(request: Request, operation: "login" | "logout" | "recover" | "password") {
  const headers = new Headers({ "Cache-Control": "private, no-store, max-age=0", Vary: "Cookie", "X-Content-Type-Options": "nosniff" });
  const json = (body: unknown, status = 200) => Response.json(body, { status, headers });
  const gateway = getSessionGateway();
  if (gateway.mode === "mock") return json({ status: "disabled" }, 404);
  const guard = createCsrfGuard(process.env);
  if (guard.status !== "available") return json({ status: "unavailable" }, 503);
  try {
    const check = await guard.guard.check(request, operation === "login" || operation === "password"
      ? { method: "POST", body: "json", maxBytes: 8192, timeoutMs: 5000 }
      : { method: "POST", body: "none", timeoutMs: 5000 });
    if (check.status !== "allowed") return json({ status: "rejected" }, check.status === "rejected" ? check.httpStatus : 503);
    const header = request.headers.get("cookie");
    const client = gateway.clientMeta(request.headers);
    const input = operation === "login" ? login.safeParse(check.body.readForValidation())
      : operation === "password" ? currentPasswordChangeSchema.safeParse(check.body.readForValidation()) : undefined;
    if (input && !input.success) return json({ status: "invalid-input", code: "MSG01" }, 400);
    // A browser keeps one random device id so the API can group its sessions into a device. It is issued on
    // the first successful sign-in and renewed on later ones; it never authenticates anything.
    const sessionCookies = operation === "login" ? createSessionCookieHelpers(process.env) : undefined;
    const deviceId = sessionCookies?.status === "available"
      ? sessionCookies.cookies.readDevice(header) ?? randomBytes(16).toString("base64url") : undefined;
    const result = operation === "login" ? await gateway.login(header, input?.data, client, request.signal, deviceId)
      : operation === "password" ? await gateway.changePassword(header, input?.data, client, request.signal)
      : operation === "logout" ? await gateway.logout(header, client) : await gateway.recover(header, client);
    if (result.status === "rejected") return json({ status: result.status, code: result.code }, result.httpStatus >= 400 && result.httpStatus < 500 ? result.httpStatus : 503);
    if (result.status === "unavailable") return json({ status: "unavailable" }, 503);
    if (result.status === "invalid-input") return json({ status: result.status, code: "MSG01" }, 400);
    for (const cookie of result.cookies ?? []) headers.append("Set-Cookie", cookie);
    if (operation === "login" && deviceId && result.status === "created" && sessionCookies?.status === "available") {
      const device = sessionCookies.cookies.issueDevice(deviceId);
      if (device) headers.append("Set-Cookie", device);
    }
    if (result.status === "session-expired") return json({ status: result.status }, 401);
    return json({ status: result.status, destination: result.destination });
  } catch { return json({ status: "unavailable" }, 503); }
}
