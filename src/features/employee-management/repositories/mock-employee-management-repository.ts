import type {
  AccountFollowUp,
  EmployeeAccountSummary,
  EmployeeManagementWorkspace,
  EmployeeProfile,
  SaveEmployeeInput,
  SaveEmployeeResult,
  UnlinkEmployeeAccountInput,
  UnlinkEmployeeAccountResult,
} from "@/features/employee-management/domain/employee-management";
import type { EmployeeManagementRepository } from "@/features/employee-management/repositories/employee-management-repository";
import { employeeEditorSchema } from "@/features/employee-management/schemas/employee-editor-schema";
import { employeeRowVersionSchema } from "@/features/employee-management/schemas/employee-row-version";

type MockOptions = Readonly<{
  getAccounts?: () => readonly EmployeeAccountSummary[];
  accounts: readonly EmployeeAccountSummary[];
  initialEmployees: readonly EmployeeProfile[];
  isAuthorized?: boolean;
  isSessionExpired?: boolean;
  latencyMs?: number;
  actorName?: string;
  now?: () => Date;
}>;

function wait(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function cloneAccount(account: EmployeeAccountSummary): EmployeeAccountSummary {
  return { ...account };
}

function cloneEmployee(employee: EmployeeProfile): EmployeeProfile {
  return {
    ...employee,
    account: employee.account ? cloneAccount(employee.account) : null,
  };
}

function sameName(first: string, second: string): boolean {
  return first.localeCompare(second, "vi", { sensitivity: "base" }) === 0;
}

export function createMockEmployeeManagementRepository({
  accounts: initialAccounts,
  getAccounts,
  initialEmployees,
  isAuthorized = true,
  isSessionExpired = false,
  latencyMs = 350,
  actorName = "Lê Minh Hải",
  now = () => new Date(),
}: MockOptions): EmployeeManagementRepository & Readonly<{ snapshotEmployees(): readonly EmployeeProfile[] }> {
  let accounts = initialAccounts;
  let employees = initialEmployees.map(cloneEmployee);
  let nextEmployeeNumber = employees.length + 1;
  let nextVersion = employees.length + 1;
  const issuedVersions = new Set(employees.map((employee) => employee.recordVersion));
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
    };
  }

  return {
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

      const parsed = employeeEditorSchema.safeParse({
        ...input,
        accountId: input.accountId ?? "",
      });
      if (!parsed.success) {
        const field = parsed.error.issues[0]?.path[0];
        return {
          field:
            field === "fullName" || field === "phone" || field === "status"
              ? field
              : "fullName",
          message: { code: "MSG01" },
          status: "invalid-input",
        };
      }

      const current = input.id
        ? employees.find((employee) => employee.id === input.id)
        : undefined;
      if (input.id && !current) {
        return {
          field: "fullName",
          message: { code: "MSG01" },
          status: "invalid-input",
        };
      }
      if (!current && parsed.data.status !== "employed") {
        return {
          field: "status",
          message: { code: "MSG01" },
          status: "invalid-input",
        };
      }
      if (current && input.recordVersion !== current.recordVersion) return conflict(current);

      const duplicate = employees.find(
        (employee) =>
          employee.id !== input.id &&
          sameName(employee.fullName, parsed.data.fullName) &&
          employee.phone === parsed.data.phone,
      );
      if (duplicate) {
        return {
          existingEmployeeId: duplicate.id,
          message: {
            code: "MSG03",
            params: { object_name: "Hồ sơ nhân viên" },
          },
          status: "duplicate",
        };
      }

      const selectedAccount = input.accountId
        ? accounts.find((account) => account.id === input.accountId)
        : undefined;
      if (input.accountId && !selectedAccount) {
        return {
          field: "accountId",
          message: { code: "MSG01" },
          status: "invalid-input",
        };
      }

      const employeeUsingAccount = input.accountId
        ? employees.find(
            (employee) =>
              employee.id !== input.id && employee.account?.id === input.accountId,
          )
        : undefined;
      if (employeeUsingAccount) {
        return {
          existingEmployeeId: employeeUsingAccount.id,
          message: {
            code: "MSG24",
            params: { employee_name: employeeUsingAccount.fullName },
          },
          status: "account-already-linked",
        };
      }

      const saved: EmployeeProfile = {
        account: selectedAccount
          ? cloneAccount(selectedAccount)
          : current?.account ? cloneAccount(current.account) : null,
        address: parsed.data.address.trim(),
        area: parsed.data.area.trim(),
        birthday: parsed.data.birthday,
        fullName: parsed.data.fullName,
        id: current?.id ?? `employee-${nextEmployeeNumber++}`,
        notes: parsed.data.notes.trim(),
        otherInformation: parsed.data.otherInformation.trim(),
        phone: parsed.data.phone,
        recordVersion: allocateVersion(),
        status: current ? parsed.data.status : "employed",
        wardCommune: parsed.data.wardCommune.trim(),
      };

      if (current) {
        employees = employees.map((employee) =>
          employee.id === current.id ? saved : employee,
        );
      } else {
        employees = [...employees, saved];
      }
      updatedAt.set(saved.id, now());

      const statusChanged = current && current.status !== saved.status;
      const followUp: AccountFollowUp | undefined =
        statusChanged && saved.account
          ? {
              account: cloneAccount(saved.account),
              action:
                saved.status === "left" ? "review-lock" : "review-access",
            }
          : undefined;

      return {
        employee: cloneEmployee(saved),
        followUp,
        message: {
          code: "MSG10",
          params: { object_name: "Hồ sơ nhân viên" },
        },
        status: "saved",
      };
    },
  };
}
