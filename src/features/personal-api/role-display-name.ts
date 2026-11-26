/** The fixed roles of the cooperative (BR-FARM-07; EMPLOYEE is the reserved read-only role of an employee account, never offered to choose) in Vietnamese. The single place that turns a backend role code or English role name into UI copy. */
export const fixedRoleLabels: Record<string, string> = { ZONE_MANAGER: "Quản lý vùng", ACCOUNTANT: "Kế toán", EMPLOYEE: "Nhân viên" };

/** "Zone Manager" / "zone-manager" -> "ZONE_MANAGER", so a role name from the backend maps like its code. */
const toCode = (name: string) => name.trim().toUpperCase().replace(/[\s-]+/g, "_");

/**
 * Vietnamese role name from the role code when known, else from the (possibly English) role name, else the name or code as sent.
 * Use it for every role shown to a person: grant history, revoke dialog and buttons, account list.
 */
export function roleDisplayName(code?: string | null, name?: string | null): string {
  return (code ? fixedRoleLabels[code] : undefined) ?? (name ? fixedRoleLabels[toCode(name)] : undefined) ?? name ?? code ?? "";
}
