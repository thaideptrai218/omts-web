import "server-only";
import { z } from "zod";
import { payrollSettingsPreview, payrollSettingsSaved, payrollSettingsView, savePayrollSettings } from "@/features/hr-setup/payroll-settings-contracts";
import type { OperationPlan } from "./operation-plan";

const previewQuery = z.strictObject({ action: z.literal("preview"), startDay: z.string().regex(/^(?:[1-9]|1\d|2[0-8])$/), automaticPayroll: z.enum(["true", "false"]) });

/**
 * Backend plan for the payroll period settings (area `payroll-settings`, LABOR-16): read, preview the next periods, save.
 * The Cooperative Owner only (backend RequireCooperativeOwner); `operationAllowed` enforces it before the backend is called.
 */
export function payrollSettingsPlan(method: string, query: URLSearchParams, input?: unknown): OperationPlan | undefined {
  const base = { area: "payroll-settings" as const, path: "/api/payroll-settings" };
  if (new Set(query.keys()).size !== query.size) return;
  if (method === "GET") {
    if (query.size === 1 && query.get("action") === "read") return { ...base, action: "read", method: "GET", permission: "View", schema: payrollSettingsView };
    const parsed = previewQuery.safeParse(Object.fromEntries(query));
    if (!parsed.success) return;
    return { ...base, action: "preview", method: "GET", permission: "View", path: `${base.path}/preview?startDay=${parsed.data.startDay}&automaticPayroll=${parsed.data.automaticPayroll}`, schema: payrollSettingsPreview };
  }
  if (method !== "POST" || query.size) return;
  const parsed = z.strictObject({ action: z.literal("save"), id: z.undefined().optional(), zoneId: z.undefined().optional(), body: savePayrollSettings }).safeParse(input);
  return parsed.success ? { ...base, action: "save", method: "PUT", permission: "Edit", body: parsed.data.body, schema: payrollSettingsSaved } : undefined;
}
