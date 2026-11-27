import "server-only";
import { z } from "zod";
import * as c from "@/features/employee-api/contracts";
import { employeeSavedSchema } from "@/features/employee-management/api/employee-contract.schemas";
import { employeeListSearchParams, parseEmployeeExportSearchParams, parseEmployeeListSearchParams } from "@/features/employee-management/api/employee-read-request";
import { issueEmployeeAccountRequestSchema, issueEmployeeAccountSavedSchema, linkEmployeeAccountRequestSchema, linkableAccountsSchema } from "@/features/employee-api/employee-account-contract";
import { createEmployeeRequestSchema, employeeCreatedWithAccountSchema } from "@/features/employee-api/employee-create-contract";
import { employeeImportResultSchema } from "@/features/employee-api/employee-file-contract";
export type Plan = { path: string; method: "GET" | "POST" | "PUT"; action: string; schema: z.ZodType; body?: unknown; id?: string; receipt?: boolean; file?: "export" | "template" | "import" };
const id = z.guid();
const mutation = z.strictObject({ action: z.enum(["create", "update", "end-employment", "resume", "issue-account", "link-account"]), id: id.optional(), body: z.unknown() });

/** The export answers with a workbook, never JSON; `ids` may repeat (ids=a&ids=b), every other key may not. */
function planExport(query: URLSearchParams): Plan | undefined {
  const rest = new URLSearchParams(query); rest.delete("action");
  const parsed = parseEmployeeExportSearchParams(rest);
  if (parsed.status !== "parsed" || query.getAll("action").length !== 1) return;
  const values = new URLSearchParams();
  for (const [key, value] of Object.entries(parsed.query)) for (const item of Array.isArray(value) ? value : [value]) if (item !== undefined) values.append(key, String(item));
  return { action: "export", file: "export", path: `/api/employees/export${values.size ? `?${values}` : ""}`, method: "GET", schema: z.never() };
}

export function planEmployeeApi(method: string, query: URLSearchParams, input?: unknown): Plan | undefined {
  if (method === "GET") {
    const action = query.get("action");
    if (action === "export") return planExport(query);
    if ([...query.keys()].length !== new Set(query.keys()).size) return;
    if (action === "import-template" && query.size === 1) return { action, file: "template", path: "/api/employees/import/template", method, schema: z.never() };
    if (action === "list") {
      const list = new URLSearchParams(query); list.delete("action");
      const parsed = parseEmployeeListSearchParams(list);
      if (parsed.status !== "parsed" || (parsed.query.search?.length ?? 0) > 200) return;
      return { action, path: `/api/employees?${employeeListSearchParams(parsed.query)}`, method, schema: c.employeePageSchema };
    }
    // What ending employment on a day would change; the day is optional (the backend defaults to today) and never after today.
    if (action === "end-preview") {
      const checked = z.strictObject({ action: z.literal("end-preview"), id, lastWorkingDay: z.iso.date().optional() }).safeParse(Object.fromEntries(query));
      if (!checked.success) return;
      const day = checked.data.lastWorkingDay;
      return { action, id: checked.data.id, path: `/api/employees/${checked.data.id}/end-employment/preview${day ? `?lastWorkingDay=${day}` : ""}`, method, schema: c.endingConsequencesSchema };
    }
    if (action === "job-types" && query.size === 1) return { action, path: "/api/job-types/options", method, schema: c.jobTypeOptionsSchema };
    // Active staff accounts no employee is linked to yet (Owner only: the backend answers 403 otherwise).
    if (action === "linkable-accounts") {
      const search = query.get("search") ?? "";
      if (query.size > 2 || (query.size === 2 && !query.has("search")) || search.length > 100) return;
      const params = new URLSearchParams({ unlinked: "true", statusId: "301", pageSize: "20" });
      if (search.trim()) params.set("search", search.trim());
      return { action, path: `/api/accounts?${params}`, method, schema: linkableAccountsSchema };
    }
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
  if (action === "create" && !employeeId) {
    const checked = createEmployeeRequestSchema.safeParse(body);
    if (!checked.success) return;
    // With an account the answer carries a one-time password and must pass the stricter receipt schema.
    const receipt = !!checked.data.account;
    return { action, path, method: "POST", body: checked.data, schema: receipt ? employeeCreatedWithAccountSchema : employeeSavedSchema, receipt };
  }
  if (!employeeId) return;
  if (action === "issue-account") return make(issueEmployeeAccountRequestSchema, issueEmployeeAccountSavedSchema, "POST", "/account");
  if (action === "link-account") return make(linkEmployeeAccountRequestSchema, employeeSavedSchema, "POST", "/account/link");
  if (action === "update") return make(c.updateProfileInputSchema, employeeSavedSchema, "PUT");
  if (action === "end-employment") return make(c.endEmploymentSchema, c.employmentChangedSchema, "POST", "/end-employment");
  if (action === "resume") return make(c.resumeEmployeeSchema, c.employmentChangedSchema, "POST", "/resume");
}

/** Upload of the import file: the HTTP layer reads the multipart body; only the endpoint is planned here. */
export function planEmployeeImport(query: URLSearchParams): Plan | undefined {
  if (query.size !== 1 || query.get("action") !== "import") return;
  return { action: "import", file: "import", path: "/api/employees/import", method: "POST", schema: employeeImportResultSchema };
}
