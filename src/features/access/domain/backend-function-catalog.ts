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

const crudExport = [...crud, "Export"] as const;
const coopWide = { cooperativeWide: true } as const;

// Mirrors omts-backend PermissionFunctions.All (codes, actions, CooperativeWide flag) as of 20/11/2026.
// A code missing here is dropped by collectFunctionPermissions, which hid backend-granted screens from Staff.
export const backendFunctionCatalog = {
  CULTIVATION_CYCLES: definition(crud),
  CULTIVATION_LOGS: definition(readWrite),
  WATER_MEASUREMENTS: definition([...readWrite, "Export"]),
  HARVESTS: definition(crud),
  HARVEST_LOTS: definition([...readWrite, "Export"]),
  HARVEST_PLANS: definition(crudExport),
  LOT_TRACING: definition(["View", "Export"]),
  SALES_RETURNS: definition(["View", "Create", "Delete"]),
  PROVENANCE: definition([...readWrite, "Publish"]),
  SUPPLIERS: definition(["View", "Create", "Edit", "Export"], coopWide),
  PURCHASE_RECEIPTS: definition(crudExport, coopWide),
  SUPPLIER_PAYMENTS: definition(["View", "Create", "Export"], coopWide),
  CUSTOMERS: definition(crudExport, coopWide),
  PURCHASE_REQUESTS: definition(["View", "Edit"], coopWide),
  SALES_ORDERS: definition(crudExport, coopWide),
  SALES_INVOICES: definition(crudExport),
  QUALITY_CLAIMS: definition(["View", "Edit"]),
  CUSTOMER_PAYMENTS: definition([...readWrite, "Export"], coopWide),
  CUSTOMER_DEBTS: definition(["View", "Export"], coopWide),
  LABOR_WORKERS: definition([...readWrite, "Export"]),
  WORK_ASSIGNMENTS: definition(crud),
  ATTENDANCE: definition(readWrite),
  PAY_RULES: definition(readWrite, coopWide),
  PAYROLL: definition([...readWrite, "Export"], coopWide),
  SALES_REPORTS: definition(["View", "Export"]),
  CASH_BOOK: definition(crudExport, coopWide),
  CASH_BOOK_SETTINGS: definition(["View", "Edit"], coopWide),
  INPUT_ISSUES: definition(crudExport),
  INPUT_DISPOSALS: definition(["View", "Export"], coopWide),
  PRODUCT_DISPOSALS: definition(crudExport),
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
