import type { PermissionProjection } from "@/features/access/domain/function-permission";

export function subjectLabel(subjectType: string): string {
  return ({ CooperativeOwner: "Chủ nhiệm HTX", Staff: "Nhân viên HTX", Trader: "Thương lái", SystemAdministrator: "Quản trị viên hệ thống", Employee: "Người lao động", PublicViewer: "Người tra cứu nguồn gốc" } as Record<string, string>)[subjectType] ?? "Người dùng";
}

export function knownRoleNameLabel(name: string): string {
  const normalized = name.trim().toLocaleLowerCase("vi");
  return ({
    owner: "Chủ nhiệm HTX",
    "cooperative owner": "Chủ nhiệm HTX",
    "chủ hợp tác xã": "Chủ nhiệm HTX",
    manager: "Quản lý vùng",
    "zone manager": "Quản lý vùng",
    accountant: "Kế toán",
    trader: "Thương lái",
    employee: "Người lao động",
    staff: "Nhân viên HTX",
    "system administrator": "Quản trị viên hệ thống",
  } as Record<string, string>)[normalized] ?? name;
}

export function workspaceRoleLabel(subjectType: string, permissions: PermissionProjection["functionPermissions"]): string {
  if (subjectType !== "Staff") return subjectLabel(subjectType);
  const managerCodes = new Set(["WORK_ASSIGNMENTS", "WATER_MEASUREMENTS", "PURCHASE_RECEIPTS", "PURCHASE_REQUESTS"]);
  const accountantCodes = new Set(["SUPPLIER_PAYMENTS", "CUSTOMER_DEBTS", "PAYROLLS"]);
  const has = (codes: ReadonlySet<string>) => permissions.some((item) => codes.has(item.functionCode));
  const roles = [has(managerCodes) ? "Quản lý vùng" : "", has(accountantCodes) ? "Kế toán" : ""].filter(Boolean);
  return roles.join(" · ") || subjectLabel(subjectType);
}
