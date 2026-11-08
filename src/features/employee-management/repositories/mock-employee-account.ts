import type { ManagedAccount, SaveAccountResult } from "@/features/account-management/domain/account-management";
import type { CreateEmployeeAccountInput, CreateEmployeeAccountResult, EmployeeAccountDraft, EmployeeAccountRejection } from "../domain/employee-account-creation";
import type { EmployeeProfile, LoadEmployeeWorkspaceResult } from "../domain/employee-management";
import { employeeRowVersionSchema } from "../schemas/employee-row-version";
import { employeeAccountSchema } from "../schemas/employee-account-schema";
import { normalizeEmployeePhone } from "../schemas/employee-phone";
import { employeeDateOnlySchema } from "../schemas/employee-date-only";

export type MockEmployeeAccountCreator = (draft: EmployeeAccountDraft,
  beforePublish: (account: ManagedAccount) => EmployeeAccountRejection | undefined) => Promise<SaveAccountResult | EmployeeAccountRejection>;
type Dependencies = Readonly<{
  authorize(): Promise<Exclude<LoadEmployeeWorkspaceResult, { status: "loaded" }> | undefined>;
  find(id: string): EmployeeProfile | undefined;
  conflict(employee: EmployeeProfile): Extract<EmployeeAccountRejection, { status: "conflict" }>;
  commit(employee: EmployeeProfile): EmployeeProfile;
  nextVersion(): string;
  create?: MockEmployeeAccountCreator;
}>;

export function createMockEmployeeAccount(deps: Dependencies) {
  function check(input: CreateEmployeeAccountInput): EmployeeAccountRejection | undefined {
    if (!employeeRowVersionSchema.safeParse(input.recordVersion).success) return { status: "invalid-version", message: { code: "MSG01" } };
    const employee = deps.find(input.employeeId);
    if (!employee) return { status: "not-found" };
    if (employee.recordVersion !== input.recordVersion) return deps.conflict(employee);
    if (employee.account) return { status: "already-linked" };
  }
  return async (input: CreateEmployeeAccountInput): Promise<CreateEmployeeAccountResult> => {
    const early = await deps.authorize();
    if (early) return early;
    const rejected = check(input);
    if (rejected) return rejected;
    if (!deps.create) return { status: "unavailable" };
    if (!input.account.newGrants.length || input.account.newGrants.some((grant) =>
      !employeeDateOnlySchema.safeParse(grant.effectiveFrom).success ||
      (grant.effectiveTo !== "" && (!employeeDateOnlySchema.safeParse(grant.effectiveTo).success || grant.effectiveTo < grant.effectiveFrom)))) {
      return { status: "invalid-input", field: "grants", message: { code: "MSG01" } };
    }
    const parsed = employeeAccountSchema.safeParse(input.account);
    if (!parsed.success) {
      const target = parsed.error.issues[0]?.path[0];
      const field = target === "phone" || target === "email" || target === "deliveryChannel" ? target : "fullName";
      return { status: "invalid-input", field, message: { code: "MSG01" } };
    }
    let linked: EmployeeProfile | undefined;
    const result = await deps.create({ ...parsed.data, newGrants: input.account.newGrants.map((grant) => ({ ...grant })),
      phone: parsed.data.phone ? normalizeEmployeePhone(parsed.data.phone) ?? parsed.data.phone : "" }, (account) => {
      const latestRejection = check(input);
      if (latestRejection) return latestRejection;
      const current = deps.find(input.employeeId)!;
      linked = deps.commit({ ...current, recordVersion: deps.nextVersion(), account: {
        id: account.id, username: account.username, displayName: account.displayName, phone: account.phone, status: account.status,
      } });
    });
    if (result.status === "saved") return linked ? { status: "created", employee: linked, delivery: result.delivery } : { status: "unavailable" };
    if (result.status === "forbidden" || result.status === "session-expired") return result;
    // A competing create can now look like a duplicate contact. The stale
    // employee version is the actionable reason; never link that duplicate.
    return check(input) ?? result;
  };
}
