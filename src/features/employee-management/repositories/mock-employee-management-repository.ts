import type {
  EmployeeAccountSummary,
  EmployeeManagementWorkspace,
  EmployeeProfile,
  SaveEmployeeInput,
  SaveEmployeeResult,
  UnlinkEmployeeAccountInput,
  UnlinkEmployeeAccountResult,
} from "@/features/employee-management/domain/employee-management";
import type { EmployeeManagementRepository } from "@/features/employee-management/repositories/employee-management-repository";
import { createEmployeeEditorSchema } from "@/features/employee-management/schemas/employee-editor-schema";
import { employeeRowVersionSchema } from "@/features/employee-management/schemas/employee-row-version";
import type { EmployeeZoneOption } from "../domain/employee-working-details";
import { createMockEmployeeEmployment, type MockEmployeeLaborReference } from "./mock-employee-employment";
import type { EmployeeAccountCreationOptions } from "../domain/employee-account-creation";
import { createMockEmployeeAccount, type MockEmployeeAccountCreator } from "./mock-employee-account";
import { buildSavedEmployee, validateMockEmployeeSave } from "./mock-employee-save-validation";
import { cloneAccount, cloneEmployee, wait } from "./mock-employee-store-helpers";

type MockOptions = Readonly<{
  getZones?: () => readonly EmployeeZoneOption[];
  getAccounts?: () => readonly EmployeeAccountSummary[];
  accounts: readonly EmployeeAccountSummary[];
  initialEmployees: readonly EmployeeProfile[];
  isAuthorized?: boolean;
  isSessionExpired?: boolean;
  latencyMs?: number;
  actorName?: string;
  now?: () => Date;
  zones?: readonly EmployeeZoneOption[];
  laborRecords?: readonly MockEmployeeLaborReference[];
  createAccount?: MockEmployeeAccountCreator;
  getAccountCreationOptions?: () => EmployeeAccountCreationOptions;
}>;

export function createMockEmployeeManagementRepository({
  accounts: initialAccounts,
  getAccounts,
  getZones,
  initialEmployees,
  isAuthorized = true,
  isSessionExpired = false,
  latencyMs = 350,
  actorName = "Ngô Nam Trung",
  now = () => new Date(),
  zones: initialZones = [],
  laborRecords = [],
  createAccount,
  getAccountCreationOptions,
}: MockOptions): EmployeeManagementRepository & Readonly<{ snapshotEmployees(): readonly EmployeeProfile[] }> {
  let accounts = initialAccounts;
  let zones = initialZones;
  let employees = initialEmployees.map(cloneEmployee);
  let nextEmployeeNumber = employees.length + 1;
  let nextVersion = employees.length + 1;
  const issuedVersions = new Set(employees.map((employee) => employee.recordVersion));
  const editorSchema = createEmployeeEditorSchema(now);
  // Simulated audit metadata only; never used to fill missing backend MSG06 params.
  const updatedAt = new Map(employees.map((employee) => [employee.id, now()]));

  function allocateVersion() {
    let version: string;
    do {
      version = btoa(`mock-employee-${++nextVersion}`);
    } while (issuedVersions.has(version));
    issuedVersions.add(version);
    return version;
  }

  function conflict(employee: EmployeeProfile) {
    return {
      status: "conflict",
      message: {
        code: "MSG06",
        params: {
          user_name: actorName,
          time: updatedAt.get(employee.id)!.toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" }),
        },
      },
    } as const;
  }

  async function prepareRequest() {
    if (latencyMs > 0) await wait(latencyMs);
    if (isSessionExpired) {
      return { message: { code: "MSG19" }, status: "session-expired" } as const;
    }
    if (!isAuthorized) {
      return { message: { code: "MSG02" }, status: "forbidden" } as const;
    }
    accounts = getAccounts?.() ?? accounts;
    zones = getZones?.() ?? zones;
  }

  /** Replaces an existing employee, stamps its audit time and returns a safe copy. */
  function commit(employee: EmployeeProfile) {
    employees = employees.map((current) => current.id === employee.id ? employee : current);
    updatedAt.set(employee.id, now());
    return cloneEmployee(employee);
  }

  function workspace(): EmployeeManagementWorkspace {
    const linkedAccountIds = new Set(
      employees.flatMap((employee) =>
        employee.account ? [employee.account.id] : [],
      ),
    );

    return {
      availableAccounts: accounts
        .filter((account) => !linkedAccountIds.has(account.id))
        .map(cloneAccount),
      employees: employees.map(cloneEmployee),
      zones: zones.map((zone) => ({ ...zone })),
      accountCreation: getAccountCreationOptions?.(),
    };
  }

  return {
    createLoginAccount: createMockEmployeeAccount({ authorize: prepareRequest, find: (id) => employees.find((item) => item.id === id),
      conflict, nextVersion: allocateVersion, create: createAccount, commit }),
    ...createMockEmployeeEmployment({
      authorize: prepareRequest,
      find: (id) => {
        const employee = employees.find((item) => item.id === id);
        const linkedAccountId = employee?.account?.id;
        const account = linkedAccountId ? accounts.find((item) => item.id === linkedAccountId) : undefined;
        return employee && account ? { ...employee, account: cloneAccount(account) } : employee;
      },
      commit,
      conflict, nextVersion: allocateVersion, now,
      laborRecords: laborRecords.map((record) => ({ ...record })),
    }),
    snapshotEmployees: () => employees.map(cloneEmployee),
    async load() {
      const earlyResult = await prepareRequest();
      if (earlyResult) return earlyResult;
      return { status: "loaded", workspace: workspace() };
    },

    async unlinkAccount(input: UnlinkEmployeeAccountInput): Promise<UnlinkEmployeeAccountResult> {
      const earlyResult = await prepareRequest();
      if (earlyResult) return earlyResult;
      if (!employeeRowVersionSchema.safeParse(input.recordVersion).success) {
        return { status: "invalid-version", message: { code: "MSG01" } };
      }
      const current = employees.find((employee) => employee.id === input.employeeId);
      if (!current) return { status: "not-found" };
      // Backend validates the syntax first, then treats an absent link as a no-op.
      if (!current.account) return { status: "unlinked", employee: cloneEmployee(current) };
      if (input.recordVersion !== current.recordVersion) return conflict(current);

      const employee = { ...current, account: null, recordVersion: allocateVersion() };
      employees = employees.map((item) => item.id === current.id ? employee : item);
      updatedAt.set(employee.id, now());
      return { status: "unlinked", employee: cloneEmployee(employee) };
    },

    async save(input: SaveEmployeeInput): Promise<SaveEmployeeResult> {
      const earlyResult = await prepareRequest();
      if (earlyResult) return earlyResult;

      const validation = validateMockEmployeeSave(input, { accounts, conflict, editorSchema, employees, zones });
      if (validation.rejection) return validation.rejection;
      const { current, data, normalizedPhone, selectedAccount } = validation;

      const saved = buildSavedEmployee({
        current, data, normalizedPhone, selectedAccount,
        nextEmployeeId: () => `employee-${nextEmployeeNumber++}`,
        nextVersion: allocateVersion,
      });

      if (current) {
        employees = employees.map((employee) =>
          employee.id === current.id ? saved : employee,
        );
      } else {
        employees = [...employees, saved];
      }
      updatedAt.set(saved.id, now());

      return {
        employee: cloneEmployee(saved),
        message: {
          code: "MSG10",
          params: { object_name: "Hồ sơ nhân viên" },
        },
        status: "saved",
      };
    },
  };
}
