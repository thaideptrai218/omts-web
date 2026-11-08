import "server-only";
import { z } from "zod";
import * as c from "@/features/employee-api/contracts";
import { employeeSavedSchema } from "@/features/employee-management/api/employee-contract.schemas";
import { parseEmployeeListSearchParams } from "@/features/employee-management/api/employee-read-request";
type Plan = { path: string; method: "GET" | "POST" | "PUT" | "DELETE"; action: string; schema: z.ZodType; body?: unknown; id?: string };
const id = z.guid();
const mutation = z.strictObject({ action: z.enum(["create", "update", "unlink", "end-employment", "reinstate"]), id: id.optional(), body: z.unknown() });
export function planEmployeeApi(method: string, query: URLSearchParams, input?: unknown): Plan | undefined {
  if (method === "GET") {
    if ([...query.keys()].length !== new Set(query.keys()).size) return;
    const action = query.get("action");
    if (action === "list") {
      const list = new URLSearchParams(query); list.delete("action");
      const parsed = parseEmployeeListSearchParams(list);
      if (parsed.status !== "parsed" || (parsed.query.search?.length ?? 0) > 200) return;
      return { action, path: `/api/employees?${new URLSearchParams(Object.entries(parsed.query).filter(([, value]) => value !== undefined).map(([key, value]) => [key, String(value)]))}`, method, schema: c.employeePageSchema };
    }
    if (action === "linkable-accounts" && query.size === 1) return { action, path: "/api/employees/linkable-accounts", method, schema: c.linkableEmployeeAccountsSchema };
    const parsed = id.safeParse(query.get("id"));
    if (action === "detail" && parsed.success && query.size === 2) return { action, id: parsed.data, path: `/api/employees/${parsed.data}`, method, schema: c.employeeViewSchema };
    return;
  }
  if (method !== "POST" || query.size) return;
  const parsed = mutation.safeParse(input);
  if (!parsed.success) return;
  const { action, id: employeeId, body } = parsed.data;
  const path = `/api/employees${employeeId ? `/${employeeId}` : ""}`;
  const make = (schema: z.ZodType, output: z.ZodType, verb: Plan["method"], suffix = "") => {
    const checked = schema.safeParse(body);
    return checked.success ? { action, id: employeeId, path: path + suffix, method: verb, body: checked.data, schema: output } : undefined;
  };
  if (action === "create" && !employeeId) return make(c.createProfileInputSchema, employeeSavedSchema, "POST");
  if (!employeeId) return;
  if (action === "update") return make(c.updateProfileInputSchema, employeeSavedSchema, "PUT");
  if (action === "end-employment") return make(c.endEmploymentSchema, c.employmentChangedSchema, "POST", "/end-employment");
  if (action === "reinstate") return make(c.employeeVersionSchema, c.employmentChangedSchema, "POST", "/reinstate");
  if (action === "unlink") {
    const checked = c.employeeVersionSchema.safeParse(body);
    return checked.success ? { action, id: employeeId, path: path + `/account?${new URLSearchParams(checked.data)}`, method: "DELETE", schema: employeeSavedSchema } : undefined;
  }
}
