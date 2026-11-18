import "server-only";
import { z } from "zod";
import { provinceList, taxCodePattern, taxLookup, wardList } from "@/features/address-invoice/contracts";
import { getSessionGateway } from "../auth/session-gateway.instance";
import { parseServerBackendConfig } from "../config/backend-config";
import { readBackendResponse } from "../backend/backend-response";
import { sameEmployeeSession } from "../employees/employee-session";

/**
 * The browser's door to the address units (api/administrative-units: provinces, then the wards of a province) and to the tax-code lookup (api/tax-lookup).
 * The units are shared reference data: any signed-in owner or staff account reads them. The lookup goes to a public registry through the backend
 * and is for those who may create or edit a customer or a supplier. Each request names the backend call, who may make it and the shape the answer must have.
 */
const unitsQuery = z.discriminatedUnion("action", [
  z.strictObject({ action: z.literal("provinces") }),
  z.strictObject({ action: z.literal("wards"), provinceCode: z.string().regex(/^[1-9]\d{0,5}$/) }),
]);
const taxQuery = z.strictObject({ taxCode: z.string().regex(taxCodePattern) });

type Access = "signed-in" | "tax-lookup";
export type AddressPlan = { path: string; schema: z.ZodType; access: Access; cacheable: boolean };

/** The backend call behind a query of the units route; undefined when the query is not one of the two allowed. */
export function planUnits(query: URLSearchParams): AddressPlan | undefined {
  const parsed = unitsQuery.safeParse(Object.fromEntries(query));
  if (!parsed.success || new Set(query.keys()).size !== query.size) return undefined;
  return parsed.data.action === "provinces"
    ? { path: "/api/administrative-units/provinces", schema: provinceList, access: "signed-in", cacheable: true }
    : { path: `/api/administrative-units/provinces/${parsed.data.provinceCode}/wards`, schema: wardList, access: "signed-in", cacheable: true };
}
/** The backend call behind a query of the tax-lookup route; undefined unless it carries one well-formed tax code and nothing else. */
export function planTaxLookup(query: URLSearchParams): AddressPlan | undefined {
  const parsed = taxQuery.safeParse(Object.fromEntries(query));
  if (!parsed.success || new Set(query.keys()).size !== query.size) return undefined;
  return { path: `/api/tax-lookup/${encodeURIComponent(parsed.data.taxCode)}`, schema: taxLookup, access: "tax-lookup", cacheable: false };
}

const lookupRights: readonly [string, string][] = [["CUSTOMERS", "Create"], ["CUSTOMERS", "Edit"], ["SUPPLIERS", "Create"], ["SUPPLIERS", "Edit"]];

async function handle(request: Request, plan: (query: URLSearchParams) => AddressPlan | undefined) {
  const headers = { "Cache-Control": "private, no-store, max-age=0", Vary: "Cookie", "X-Content-Type-Options": "nosniff" };
  const json = (body: unknown, status = 200, cacheable = false) => Response.json(body, { status, headers: cacheable ? { ...headers, "Cache-Control": "private, max-age=3600" } : headers });
  const gateway = getSessionGateway(), backend = parseServerBackendConfig(process.env);
  if (gateway.mode === "mock") return json({ status: "disabled" }, 404);
  if (backend.status !== "valid" || backend.config.source !== "api") return json({ status: "unavailable" }, 503);
  if (request.method !== "GET") return json({ status: "invalid-input" }, 405);
  try {
    const target = plan(new URL(request.url).searchParams);
    if (!target) return json({ status: "invalid-input", code: "MSG01" }, 400);

    const initial = await gateway.resolve(request.headers.get("cookie"));
    if (initial.status !== "resolved") return json({ status: initial.status === "unavailable" ? "unavailable" : "session-expired" }, initial.status === "unavailable" ? 503 : 401);
    const context = await gateway.application(request.headers.get("cookie"));
    if (context.status === "onboarding-required") return json({ status: "onboarding-required" }, 403);
    if (context.status !== "ready") return json({ status: "unavailable" }, 503);
    const { identity, permissions } = context.context;
    const granted = (functionCode: string, action: string) => permissions.functionPermissions.some((p) => p.functionCode === functionCode && p.action === action);
    const allowed = identity.subjectType === "CooperativeOwner" || identity.subjectType === "Staff" && (target.access === "signed-in" || lookupRights.some(([fn, action]) => granted(fn, action)));
    if (!allowed) return json({ status: "forbidden", code: "MSG02" }, 403);

    const signal = AbortSignal.any([request.signal, AbortSignal.timeout(Math.max(20_000, backend.config.timeoutMs))]);
    const response = await fetch(new URL(target.path, backend.config.origin), { method: "GET", cache: "no-store", credentials: "omit", redirect: "error", signal,
      headers: { Accept: "application/json", Authorization: `Bearer ${initial.session.readAccessTokenForBackend()}` } });
    const result = await readBackendResponse(response, "profileRead");
    const current = await gateway.resolve(request.headers.get("cookie"));
    if (current.status !== "resolved" || !sameEmployeeSession(initial.session, current.session)) return json({ status: "session-expired" }, 401);
    if (result.status === "http-error") return json({ status: "rejected", code: result.code }, result.httpStatus);
    if (result.status !== "success" || response.status !== 200) return json({ status: "unavailable" }, 503);
    const value = target.schema.safeParse(result.data);
    if (!value.success) return json({ status: "invalid-response" }, 502);
    return json({ status: "success", data: value.data }, 200, target.cacheable);
  } catch { return json({ status: "unavailable" }, 503); }
}

export const handleAdministrativeUnits = (request: Request) => handle(request, planUnits);
export const handleTaxLookup = (request: Request) => handle(request, planTaxLookup);
