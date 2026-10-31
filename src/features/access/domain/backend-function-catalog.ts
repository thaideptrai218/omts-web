import type { FunctionAction } from "@/features/access/domain/function-permission";

function definition(
  actions: readonly FunctionAction[],
  options: { cooperativeWide?: boolean; dashboardTile?: boolean } = {},
) {
  return { actions, cooperativeWide: false, dashboardTile: false, ...options };
}

const crud = ["View", "Create", "Edit", "Delete"] as const;
const readWrite = ["View", "Create", "Edit"] as const;
const viewTile = definition(["View"], { dashboardTile: true });

// Snapshot 48ae1e0/PermissionFunctions.cs, not a BA-approved default role matrix.
export const backendFunctionCatalog = {
  CULTIVATION_CYCLES: definition(crud),
  CULTIVATION_LOGS: definition(readWrite),
  WATER_MEASUREMENTS: definition([...readWrite, "Export"]),
  HARVESTS: definition(crud),
  HARVEST_LOTS: definition([...readWrite, "Export"]),
  PROVENANCE: definition([...readWrite, "Publish"]),
  SUPPLIERS: definition(readWrite),
  PURCHASE_RECEIPTS: definition([...crud, "Export"]),
  SUPPLIER_PAYMENTS: definition(["View", "Create", "Export"], { cooperativeWide: true }),
  CUSTOMERS: definition(readWrite),
  PURCHASE_REQUESTS: definition(readWrite),
  SALES_INVOICES: definition([...crud, "Export"]),
  QUALITY_CLAIMS: definition(readWrite),
  CUSTOMER_PAYMENTS: definition([...readWrite, "Export"], { cooperativeWide: true }),
  CUSTOMER_DEBTS: definition(["View", "Export"], { cooperativeWide: true }),
  LABOR_WORKERS: definition(readWrite),
  WORK_ASSIGNMENTS: definition(crud),
  ATTENDANCE: definition(readWrite),
  PAY_RULES: definition(readWrite, { cooperativeWide: true }),
  PAYROLL: definition([...readWrite, "Export"], { cooperativeWide: true }),
  SALES_REPORTS: definition(["View", "Export"]),
  DASHBOARD_DAILY_REVENUE: viewTile,
  DASHBOARD_RECEIVABLES: viewTile,
  DASHBOARD_OPEN_HARVEST_LOTS: viewTile,
  DASHBOARD_WATER_ALERTS: viewTile,
  DASHBOARD_PENDING_TASKS: viewTile,
} as const;

export type BackendFunctionCode = keyof typeof backendFunctionCatalog;

export function isBackendFunctionCode(code: string): code is BackendFunctionCode {
  return Object.hasOwn(backendFunctionCatalog, code);
}
